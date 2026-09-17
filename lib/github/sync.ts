import { ItemSource, ItemStatus, SyncStatus, SyncTrigger, type Repository } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getOctokitForRepo, getFileContent, listRepoDocFiles } from "@/lib/github/client";
import { classifyDocType, parsePendingItemsFromDoc } from "@/lib/github/docs-parser";
import { nextItemPublicId } from "@/lib/ids";
import { recordAudit } from "@/lib/audit";

/**
 * Syncs documentation from a repository: lists known doc files, fetches only
 * the ones whose git blob sha changed, updates `repository_documents`, and
 * (only when the repo is linked to a Project) turns pending checklist items
 * in BUGS.md/BACKLOG.md/INCIDENTS.md/ROADMAP.md into Items with
 * source=GITHUB_DOC. Existing items are matched by title to avoid duplicates
 * on every sync — this is intentionally simple, see docs/GITHUB_INTEGRATION.md.
 */
export async function syncRepository(repository: Repository, trigger: SyncTrigger = SyncTrigger.MANUAL) {
  const sync = await prisma.repositorySync.create({
    data: { repositoryId: repository.id, trigger, status: SyncStatus.RUNNING },
  });

  let filesScanned = 0;
  let itemsCreated = 0;
  let itemsUpdated = 0;

  try {
    const octokit = getOctokitForRepo(repository);
    const files = await listRepoDocFiles(octokit, repository.owner, repository.name, repository.defaultBranch);
    const project = repository.projectId
      ? await prisma.project.findUnique({ where: { id: repository.projectId } })
      : null;

    for (const file of files) {
      filesScanned++;
      const existingDoc = await prisma.repositoryDocument.findUnique({
        where: { repositoryId_path: { repositoryId: repository.id, path: file.path } },
      });

      // Git blob sha already tells us if content changed — no need to fetch it otherwise.
      if (existingDoc && existingDoc.contentHash === file.sha) continue;

      const content = await getFileContent(
        octokit,
        repository.owner,
        repository.name,
        file.path,
        repository.defaultBranch
      );
      const docType = classifyDocType(file.path);

      let parsedCount = 0;
      if (project) {
        const pendingItems = parsePendingItemsFromDoc(docType, content);
        for (const parsed of pendingItems) {
          if (parsed.publicIdTag) {
            // Already tracked under a known id — nothing to create, just skip.
            const known = await prisma.item.findUnique({ where: { publicId: parsed.publicIdTag } });
            if (known) continue;
          }

          const existingItem = await prisma.item.findFirst({
            where: {
              projectId: project.id,
              type: parsed.itemType,
              title: parsed.title,
              status: { not: ItemStatus.DISCARDED },
            },
          });
          if (existingItem) continue;

          await prisma.$transaction(async (tx) => {
            const publicId = await nextItemPublicId(tx, project.id, project.code, parsed.itemType);
            await tx.item.create({
              data: {
                publicId,
                projectId: project.id,
                type: parsed.itemType,
                title: parsed.title,
                status: ItemStatus.PENDING,
                source: ItemSource.GITHUB_DOC,
                metadata: { repositoryId: repository.id, path: file.path },
              },
            });
          });
          itemsCreated++;
          parsedCount++;
        }
      }

      await prisma.repositoryDocument.upsert({
        where: { repositoryId_path: { repositoryId: repository.id, path: file.path } },
        create: {
          repositoryId: repository.id,
          path: file.path,
          docType,
          contentHash: file.sha,
          parsedItems: parsedCount,
        },
        update: { docType, contentHash: file.sha, parsedItems: parsedCount, lastSyncedAt: new Date() },
      });
      itemsUpdated++;
    }

    await prisma.repository.update({ where: { id: repository.id }, data: { lastSyncedAt: new Date() } });
    await prisma.repositorySync.update({
      where: { id: sync.id },
      data: { status: SyncStatus.SUCCESS, filesScanned, itemsCreated, itemsUpdated, finishedAt: new Date() },
    });
    await recordAudit({
      action: "repository.synced",
      entityType: "Repository",
      entityId: repository.id,
      metadata: { filesScanned, itemsCreated, itemsUpdated, trigger },
    });
  } catch (error) {
    await prisma.repositorySync.update({
      where: { id: sync.id },
      data: {
        status: SyncStatus.FAILED,
        error: error instanceof Error ? error.message : String(error),
        filesScanned,
        itemsCreated,
        itemsUpdated,
        finishedAt: new Date(),
      },
    });
    throw error;
  }
}

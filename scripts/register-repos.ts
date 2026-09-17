import "dotenv/config";
import { prisma } from "@/lib/db";
import { syncRepository } from "@/lib/github/sync";

const REPOS: { owner: string; name: string; projectCode: string }[] = [
  { owner: "NahimMora", name: "news-auto-publisher-lavozriojana", projectCode: "LVR" },
  { owner: "NahimMora", name: "lavozriojana-news-app", projectCode: "LVR" },
  { owner: "NahimMora", name: "ops-web-app", projectCode: "HS" },
  { owner: "NahimMora", name: "HolaSaltaManager", projectCode: "HS" },
];

async function main() {
  for (const r of REPOS) {
    const project = await prisma.project.findUnique({ where: { code: r.projectCode } });
    const repository = await prisma.repository.upsert({
      where: { owner_name: { owner: r.owner, name: r.name } },
      create: { owner: r.owner, name: r.name, projectId: project?.id, tokenEnvVar: "GITHUB_TOKEN" },
      update: { projectId: project?.id },
    });
    console.log(`Registrado ${r.owner}/${r.name} -> proyecto ${r.projectCode}`);

    try {
      await syncRepository(repository);
      console.log(`  sync OK`);
    } catch (error) {
      console.error(`  sync FALLÓ:`, error instanceof Error ? error.message : error);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

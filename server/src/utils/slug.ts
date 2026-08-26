import {
  prisma,
} from "../config/prisma.js";

function slugify(
  value: string
) {
  return value
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );
}

function randomSuffix() {
  return Math.random()
    .toString(36)
    .slice(2, 7);
}

export async function createUniqueWorkspaceSlug(
  name: string
) {
  let baseSlug =
    slugify(name);

  if (!baseSlug) {
    baseSlug =
      "workspace";
  }

  /*
   * PostgreSQL column has
   * VARCHAR(120).
   *
   * Leave room for a potential
   * uniqueness suffix.
   */
  baseSlug =
    baseSlug.slice(
      0,
      110
    );

  const existing =
    await prisma.workspace.findUnique({
      where: {
        slug: baseSlug,
      },

      select: {
        id: true,
      },
    });

  if (!existing) {
    return baseSlug;
  }

  /*
   * Example:
   *
   * kitedesk-team-x7f29
   */
  let slug =
    `${baseSlug}-${randomSuffix()}`;

  while (
    await prisma.workspace.findUnique({
      where: {
        slug,
      },

      select: {
        id: true,
      },
    })
  ) {
    slug =
      `${baseSlug}-${randomSuffix()}`;
  }

  return slug;
}
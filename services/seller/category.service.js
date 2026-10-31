const { attributes } = require("../../data/categories/electronics");
const Category = require("../../models/category.model");

/**
 * Fetch category hierarchy with optional seller mode filter
 * @param {string} [mode] - Seller commission model ("PAL" | "PAP"), optional
 */
async function getNestedCategoriesByMode(mode) {
  const matchStage = {
    parent: null,
    isActive: true,
    isDeleted: false,
    ...(mode ? { allowedModes: { $in: [mode] } } : {}),
  };

  const restrictStage = {
    isActive: true,
    isDeleted: false,
    ...(mode ? { allowedModes: { $in: [mode] } } : {}),
  };

  const pipeline = [
    { $match: matchStage },
    {
      $graphLookup: {
        from: "categories",
        startWith: "$_id",
        connectFromField: "_id",
        connectToField: "parent",
        as: "subcategories",
        restrictSearchWithMatch: restrictStage,
        depthField: "depth",
        // optional safeguard: maxDepth: 10
      },
    },
    {
      $project: {
        name: 1,
        slug: 1,
        parent: 1,
        level: 1,
        type: 1,
        description: 1,
        image: 1,
        allowedModes: 1,
        modeRules: 1,
        attributes,
        subcategories: {
          _id: 1,
          name: 1,
          slug: 1,
          parent: 1,
          level: 1,
          type: 1,
          description: 1,
          image: 1,
          allowedModes: 1,
          modeRules: 1,
          attributes,
          depth: 1,
        },
      },
    },
    { $sort: { name: 1 } },
  ];

  const results = await Category.aggregate(pipeline);

  // Safe tree builder with cycle prevention
  const buildTree = (root, all, visited = new Set()) => {
    if (visited.has(root._id.toString())) return [];
    visited.add(root._id.toString());

    const map = new Map(
      all.map((c) => [c._id.toString(), { ...c, subcategories: [] }])
    );
    const children = [];

    for (const c of all) {
      if (c.parent?.toString() === root._id.toString()) {
        const child = map.get(c._id.toString());
        child.subcategories = buildTree(child, all, visited);
        children.push(child);
      }
    }

    return children;
  };

  return results.map((root) => {
    root.subcategories = buildTree(root, root.subcategories || []);
    return root;
  });
}

module.exports = { getNestedCategoriesByMode };

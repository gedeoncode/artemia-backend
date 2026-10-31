require("dotenv").config();
const Category = require("../../models/category.model.js");

const { connectDB } = require("../../config/db.config.js");

async function migrateHomepage() {
  try {
    await connectDB();

    const updates = [
      {
        code: "FASH",
        homepage: {
          enabled: true,
          hero: { enabled: true, order: 1 },
          sections: [],
        },
      },
      {
        code: "PROP",
        homepage: {
          enabled: true,
          hero: { enabled: true, order: 1 },
          sections: [],
        },
      },
      {
        code: "VEHI",
        homepage: {
          enabled: true,
          hero: { enabled: true, order: 1 },
          sections: [],
        },
      },
      {
        code: "HOME",
        homepage: {
          enabled: true,
          hero: { enabled: true, order: 1 },
          sections: [],
        },
      },
      {
        code: "ELEC",
        homepage: {
          enabled: true,
          hero: { enabled: true, order: 1 },
          sections: [],
        },
      },
    ];

    for (const item of updates) {
      await Category.updateOne(
        { code: item.code },
        {
          $set: {
            homepage: item.homepage,
          },
        }
      );
    }

    console.log("Homepage migration completed");
  } catch (error) {
    console.error(error);
  }
}

migrateHomepage()
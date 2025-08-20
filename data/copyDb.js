const { exec } = require("child_process");
const readline = require("readline");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../config.env") });

const PROD_URI = process.env.PROD_DATABASE;
const STAGE_URI = process.env.STAGE_DATABASE;
const DEV_URI = process.env.DEV_DATABASE;
const PROD_DB_NAME = process.env.PROD_DATABASE_NAME.replace(/"/g, "");
const DUMP_PATH = path.resolve(__dirname, "../dump");

function run(command) {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) return reject(stderr || err);
      resolve(stdout);
    });
  });
}

async function copyDb(target) {
  let targetUri;
  let targetName;
  if (target === "staging") {
    targetUri = STAGE_URI;
    targetName = "STAGE";
  } else if (target === "dev") {
    targetUri = DEV_URI;
    targetName = "DEV";
  } else {
    console.error("Invalid target environment.");
    return;
  }

  try {
    console.log(`Dumping production database (${PROD_DB_NAME})...`);
    await run(
      `mongodump --uri="${PROD_URI}" --db=${PROD_DB_NAME} --out=${DUMP_PATH}`
    );
    console.log(`Restoring to ${targetName} database...`);
    await run(
      `mongorestore --uri="${targetUri}" --drop ${DUMP_PATH}/${PROD_DB_NAME}`
    );
    console.log(
      `Copy complete! Production data copied to ${targetName} database.`
    );
  } catch (err) {
    console.error("Error copying database:", err);
  }
}

function promptEnvironment() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("Copy production data to (staging/dev)? ", (answer) => {
    const env = answer.trim().toLowerCase();
    if (env === "staging" || env === "dev") {
      copyDb(env).finally(() => rl.close());
    } else {
      console.log("Invalid input. Please enter 'staging' or 'dev'.");
      rl.close();
    }
  });
}

promptEnvironment();

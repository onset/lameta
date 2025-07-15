const assert = require("assert");
const ocfl = require("@ocfl/ocfl-fs");
const { Collector, generateArcpId } = require("../index");
Collector.mainPackage = require("../package.json");
const { ROCrate } = require("ro-crate");
const path = require("path");
const rimraf = require("rimraf");

const basePath = "test-data/collector_ocfl";
const rocratesPath = "test-data/rocrates";
const repoPath = path.join(basePath, "ocfl");
const namespace = "collector-test";
const dataDir = path.join(basePath, "files");
const templateCrateDir = path.join(basePath, "template");
const title = "Farms to Freeways Example Dataset";
const titleV2 = "Farms to Freeways Example Dataset - Im v2!";
const newDescription = "NEW DESCRIPTION";
const description = "description";
const datePublished = "2025";
const license = "cc-by-4.0";

let collector;
let corpusCrateRootId;
let repository;

describe("Create OCFL Repo", function () {
  before(function () {
    rimraf.sync(repoPath);
    console.log(`${repoPath} deleted`);
  });

  it("Should make a new Collector", async function () {
    collector = new Collector({
      repoPath,
      namespace,
      dataDir,
      templateCrateDir
    });
    assert.equal(collector.opts.repoPath, repoPath);
  });

  it("can connect", async function () {
    await collector.connect();
  });

  it("can add V1", async function () {
    console.log(collector.templateCrateDir);
    const corpusRepo = collector.newObject(collector.templateCrateDir);
    corpusRepo.mintArcpId(["corpus", "root"]);
    const corpusCrate = corpusRepo.crate;
    corpusCrateRootId = generateArcpId(collector.namespace, ["corpus", "root"]);
    corpusCrate.rootId = corpusCrateRootId;
    corpusCrate.rootDataset.name = title;
    corpusCrate.rootDataset.description = description;
    corpusCrate.rootDataset.datePublished = datePublished;
    corpusCrate.rootDataset.license = license;
    await corpusRepo.addToRepo();
  });

  it("can get V1 crate", async function () {
    const object = collector.repo.object(corpusCrateRootId);
    await object.load();
    const crateFile = await object
      .getFile({ logicalPath: "ro-crate-metadata.json" })
      .asString();
    const crate = new ROCrate(JSON.parse(crateFile));
    assert(crate.rootDataset.name, title);
  });

  it("can add V2", async function () {
    const corpusRepo = collector.newObject(collector.templateCrateDir);
    corpusRepo.mintArcpId("corpus", "root");
    const corpusCrate = corpusRepo.crate;
    corpusCrateRootId = generateArcpId(collector.namespace, ["corpus", "root"]);
    corpusCrate.rootId = corpusCrateRootId;
    corpusCrate.rootDataset.name = titleV2;
    corpusCrate.rootDataset.description = description;
    corpusCrate.rootDataset.datePublished = datePublished;
    corpusCrate.rootDataset.license = license;
    await corpusRepo.addToRepo();
  });

  it("can get V2 crate", async function () {
    const object = collector.repo.object(corpusCrateRootId);
    await object.load();
    const crateFile = await object
      .getFile({ logicalPath: "ro-crate-metadata.json" })
      .asString();
    const crate = new ROCrate(JSON.parse(crateFile));
    assert(crate.rootDataset.name, titleV2);
  });

  it("can add V3 ", async function () {
    const corpusRepo = collector.newObject(collector.templateCrateDir);
    corpusRepo.mintArcpId("corpus", "root");
    const corpusCrate = corpusRepo.crate;
    corpusCrateRootId = generateArcpId(collector.namespace, ["corpus", "root"]);
    corpusCrate.rootId = corpusCrateRootId;
    corpusCrate.rootDataset.name = title;
    corpusCrate.rootDataset.description = description;
    corpusCrate.rootDataset.datePublished = datePublished;
    corpusCrate.rootDataset.license = license;
    await corpusRepo.addToRepo();
  });

  it("can get V3 crate", async function () {
    const object = collector.repo.object(corpusCrateRootId);
    await object.load();
    const crateFile = await object
      .getFile({ logicalPath: "ro-crate-metadata.json" })
      .asString();
    const crate = new ROCrate(JSON.parse(crateFile));
    assert(crate.rootDataset.name, title);
  });

  it("can add V4 ", async function () {
    const corpusRepo = collector.newObject(collector.templateCrateDir);
    corpusRepo.mintArcpId("corpus", "root");
    const corpusCrate = corpusRepo.crate;
    corpusCrateRootId = generateArcpId(collector.namespace, ["corpus", "root"]);
    corpusCrate.rootId = corpusCrateRootId;
    corpusCrate.rootDataset.name = "root v4";
    corpusCrate.rootDataset.description = newDescription;
    corpusCrate.rootDataset.datePublished = datePublished;
    corpusCrate.rootDataset.license = license;
    corpusCrate.rootDataset["@type"] = ["Dataset", "RepositoryCollection"];
    await corpusRepo.addToRepo();
  });

  it("can get V4 crate", async function () {
    const object = collector.repo.object(corpusCrateRootId);
    await object.load();
    const crateFile = await object
      .getFile({ logicalPath: "ro-crate-metadata.json" })
      .asString();
    const crate = new ROCrate(JSON.parse(crateFile));
    assert(crate.rootDataset.description, newDescription);
  });

  it("should error if crate is not valid when adding to repository", async function () {
    const corpusRepo = collector.newObject(collector.templateCrateDir);
    corpusRepo.mintArcpId("corpus", "root");
    const corpusCrate = corpusRepo.crate;
    corpusCrateRootId = generateArcpId(collector.namespace, ["corpus", "root"]);
    corpusCrate.rootId = corpusCrateRootId;
    corpusCrate.rootDataset.description = newDescription;
    corpusCrate.rootDataset.datePublished = datePublished;
    corpusCrate.rootDataset.license = license;
    corpusCrate.rootDataset["@type"] = ["Dataset", "RepositoryCollection"];
    try {
      await corpusRepo.addToRepo();
    } catch (e) {
      // corpusCrate.rootDataset.name is not defined
      assert(e instanceof Error);
    }
  });

  it("should not error if crate references files", async function () {
    const validateCrateDir = path.join(rocratesPath, "validate");
    const collectorValidate = new Collector({
      repoPath,
      namespace,
      dataDir: validateCrateDir,
      template: validateCrateDir
    });
    await collectorValidate.connect();
    const corpusRepo = collectorValidate.newObject(
      collectorValidate.templateCrateDir
    );
    corpusRepo.mintArcpId("corpus", "root");
    const corpusCrate = corpusRepo.crate;
    corpusCrateRootId = generateArcpId(collectorValidate.namespace, [
      "corpus",
      "root"
    ]);
    corpusCrate.rootId = corpusCrateRootId;
    corpusCrate.rootDataset.name = "name";
    corpusCrate.rootDataset.description = newDescription;
    corpusCrate.rootDataset.datePublished = datePublished;
    corpusCrate.rootDataset.license = license;
    corpusCrate.rootDataset["@type"] = ["Dataset", "RepositoryCollection"];
    await corpusRepo.addFile(
      { "@id": "csvs/some_file.csv" },
      collectorValidate.templateCrateDir,
      null,
      false
    );
    await corpusRepo.addFile(
      { "@id": "another_example.txt" },
      collectorValidate.templateCrateDir,
      null,
      false
    );
    await corpusRepo.addToRepo();
  });

  it("should error if crate references files and are not in the repository", async function () {
    const validateCrateDir = path.join(rocratesPath, "validate");
    const collectorValidate = new Collector({
      repoPath,
      namespace,
      dataDir: validateCrateDir,
      template: validateCrateDir
    });
    await collectorValidate.connect();
    const corpusRepo = collectorValidate.newObject(
      collectorValidate.templateCrateDir
    );
    corpusRepo.mintArcpId("corpus", "root");
    const corpusCrate = corpusRepo.crate;
    corpusCrateRootId = generateArcpId(collectorValidate.namespace, [
      "corpus",
      "root"
    ]);
    corpusCrate.rootId = corpusCrateRootId;
    corpusCrate.rootDataset.name = "name";
    corpusCrate.rootDataset.description = newDescription;
    corpusCrate.rootDataset.datePublished = datePublished;
    corpusCrate.rootDataset.license = license;
    corpusCrate.rootDataset["@type"] = ["Dataset", "RepositoryCollection"];
    //Not adding csvs/some_file.csv to trigger an error
    await corpusRepo.addFile(
      { "@id": "another_example.txt" },
      collectorValidate.templateCrateDir,
      null,
      false
    );
    try {
      await corpusRepo.addToRepo();
    } catch (e) {
      assert(e instanceof Error);
    }
  });
});

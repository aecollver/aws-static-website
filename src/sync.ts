import CloudFormation from "aws-sdk/clients/cloudformation";
import S3 from "aws-sdk/clients/s3";
import { createReadStream, readdirSync, statSync } from "fs";
import { join } from "path";

const root = join(process.argv[3], "public");

upload().then(ignore => { })
  .catch(error => {
    console.error(error.stack);
  });

async function upload() {
  const bucketName = await getBucketName();
  console.log("Bucket: " + bucketName);
  const s3 = new S3();
  for (const [path, file] of listFiles()) {
    if (path !== "." && file === "index.html") {
      console.log("Uploading: " + join(path, "/"));
      const content = createReadStream(join(root, path, file));

      try {
        await s3.putObject({
          Bucket: bucketName,
          Key: path, // Default object
          Body: content,
          CacheControl: "max-age=300",
          ContentType: "text/html"
        }).promise();
      } finally {
        content.close();
      }
    }

    console.log("Uploading: " + join(path, file));
    const content = createReadStream(join(root, path, file));

    try {
      await s3.putObject({
        Bucket: bucketName,
        Key: join(path, file),
        Body: content,
        CacheControl: "max-age=300",
        ContentType: "text/html"
      }).promise();
    } finally {
      content.close();
    }
  }
}

function* listFiles() {
  const unvisited = ["."];

  do {
    const current = unvisited.pop();

    for (const child of readdirSync(join(root, current))) {
      if (statSync(join(root, current, child)).isDirectory()) {
        unvisited.push(join(current, child));
      } else {
        yield [current, child];
      }
    }
  } while (unvisited.length > 0);
}

async function getBucketName() {
  const cloudFormation = new CloudFormation({
    region: "us-east-1"
  });
  const stacks = await cloudFormation.describeStacks({
    StackName: "Website-aaroncollver-com"
  }).promise();

  const outputs = stacks.Stacks[0].Outputs.reduce((map, entry) => {
    map.set(entry.OutputKey, entry.OutputValue);
    return map;
  }, new Map());

  return outputs.get("ContentBucketName");
}

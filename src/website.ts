import { App, Construct, Stack, StackProps } from "@aws-cdk/core";
import isValidDomain from "is-valid-domain";

class WebsiteStack extends Stack {
  constructor(scope: Construct, name: string, props: StackProps) {
    super(scope, name, props);
  }
}

const app = new App();
const domainName: string = process.env.npm_config_domain_name;
if (!isValidDomain(domainName)) {
  throw new Error(`Invalid domain: ${domainName}`);
}

new WebsiteStack(app, `Website-${domainName.replace(".", "-")}`, {
  env: {
    // Create the stack in us-east-1 because CloudFront expects an ACM certificate in us-east-1
    region: "us-east-1"
  }
});

app.synth();

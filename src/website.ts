import { CfnCloudFrontOriginAccessIdentity, CloudFrontWebDistribution, OriginProtocolPolicy } from "@aws-cdk/aws-cloudfront";
import { CanonicalUserPrincipal } from "@aws-cdk/aws-iam";
import { ARecord, HostedZone, RecordTarget } from "@aws-cdk/aws-route53";
import { CloudFrontTarget } from "@aws-cdk/aws-route53-targets";
import { Bucket, RedirectProtocol } from "@aws-cdk/aws-s3";
import { App, Construct, RemovalPolicy, Stack, StackProps } from "@aws-cdk/core";
import isValidDomain from "is-valid-domain";

class WebsiteStack extends Stack {
  constructor(scope: Construct, name: string, props: StackProps) {
    super(scope, name, props);

    const zone = new HostedZone(this, process.env.npm_config_domain_name, {
      zoneName: process.env.npm_config_domain_name
    });

    // https://github.com/aws/aws-cdk/issues/941
    const contentAccessIdentity = new CfnCloudFrontOriginAccessIdentity(this, "ContentAccessIdentity", {
      cloudFrontOriginAccessIdentityConfig: {
        comment: process.env.npm_config_domain_name
      }
    });

    const content = new Bucket(this, "Content", {
      removalPolicy: RemovalPolicy.DESTROY
    });
    content.grantRead(new CanonicalUserPrincipal(contentAccessIdentity.getAtt("S3CanonicalUserId").toString()));

    const website = new CloudFrontWebDistribution(this, "Website", {
      comment: process.env.npm_config_domain_name,
      originConfigs: [{
        behaviors: [{ isDefaultBehavior: true }],
        s3OriginSource: {
          s3BucketSource: content,
          originAccessIdentityId: contentAccessIdentity.ref
        }
      }]
    });

    new ARecord(this, 'ApexRecord', {
      zone,
      recordName: `${process.env.npm_config_domain_name}.`,
      target: {
        aliasTarget: new CloudFrontTarget(website)
      }
    });

    if (process.env.npm_config_redirect_domain_name) {
      const redirect = new Bucket(this, "RedirectContent", {
        websiteRedirect: {
          protocol: RedirectProtocol.HTTPS,
          hostName: website.domainName
        },
        removalPolicy: RemovalPolicy.DESTROY
      });

      const redirectWebsite = new CloudFrontWebDistribution(this, "RedirectWebsite", {
        comment: process.env.npm_config_redirect_domain_name,
        originConfigs: [{
          behaviors: [{ isDefaultBehavior: true }],
          customOriginSource: {
            domainName: redirect.bucketWebsiteDomainName,
            originProtocolPolicy: OriginProtocolPolicy.HTTP_ONLY
          }
        }]
      });

      new ARecord(this, 'RedirectRecord', {
        zone,
        recordName: `${process.env.npm_config_redirect_domain_name}.`,
        target: {
          aliasTarget: new CloudFrontTarget(redirectWebsite)
        }
      });
    }
  }
}

const app = new App();
const domainName: string = process.env.npm_config_domain_name;
if (!isValidDomain(domainName)) {
  throw new Error(`Invalid domain: ${domainName}`);
}

new WebsiteStack(app, `Website-${domainName.replace(/\./g, "-")}`, {
  env: {
    // Create the stack in us-east-1 because CloudFront expects an ACM certificate in us-east-1
    region: "us-east-1"
  }
});

app.synth();

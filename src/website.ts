import { CfnCloudFrontOriginAccessIdentity, CloudFrontWebDistribution, OriginProtocolPolicy } from "@aws-cdk/aws-cloudfront";
import { CanonicalUserPrincipal } from "@aws-cdk/aws-iam";
import { ARecord, HostedZone } from "@aws-cdk/aws-route53";
import { CloudFrontTarget } from "@aws-cdk/aws-route53-targets";
import { Bucket, RedirectProtocol } from "@aws-cdk/aws-s3";
import { App, Construct, RemovalPolicy, Stack, StackProps } from "@aws-cdk/core";
import isValidDomain from "is-valid-domain";

interface WebsiteStackProps extends StackProps {
  domainName: string;
  redirectDomainName?: string;
}

class WebsiteStack extends Stack {
  constructor(scope: Construct, name: string, props: WebsiteStackProps) {
    super(scope, name, props);

    const zone = new HostedZone(this, props.domainName, {
      zoneName: props.domainName
    });

    // https://github.com/aws/aws-cdk/issues/941
    const contentAccessIdentity = new CfnCloudFrontOriginAccessIdentity(this, "ContentAccessIdentity", {
      cloudFrontOriginAccessIdentityConfig: {
        comment: props.domainName
      }
    });

    const content = new Bucket(this, "Content", {
      removalPolicy: RemovalPolicy.DESTROY
    });
    content.grantRead(new CanonicalUserPrincipal(contentAccessIdentity.getAtt("S3CanonicalUserId").toString()));

    const website = new CloudFrontWebDistribution(this, "Website", {
      comment: props.domainName,
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
      recordName: `${props.domainName}.`,
      target: {
        aliasTarget: new CloudFrontTarget(website)
      }
    });

    if (props.redirectDomainName) {
      const redirect = new Bucket(this, "RedirectContent", {
        websiteRedirect: {
          protocol: RedirectProtocol.HTTPS,
          hostName: website.domainName
        },
        removalPolicy: RemovalPolicy.DESTROY
      });

      const redirectWebsite = new CloudFrontWebDistribution(this, "RedirectWebsite", {
        comment: props.redirectDomainName,
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
        recordName: `${props.redirectDomainName}.`,
        target: {
          aliasTarget: new CloudFrontTarget(redirectWebsite)
        }
      });
    }
  }
}

const app = new App();
const domainName: string = app.node.tryGetContext("domain_name");
if (!isValidDomain(domainName)) {
  throw new Error(`Invalid domain: ${domainName}`);
}

new WebsiteStack(app, `Website-${domainName.replace(/\./g, "-")}`, {
  domainName,
  redirectDomainName: app.node.tryGetContext("redirect_domain_name"),
  env: {
    // Create the stack in us-east-1 because CloudFront expects an ACM certificate in us-east-1
    region: "us-east-1"
  }
});

app.synth();

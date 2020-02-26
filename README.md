Serves a static website and optionally redirects a subdomain like www to it.

## Usage

### Setup
Add config to `package.json` file that looks like:

```
"config": {
  "aws_profile": "<Profile Name>",
  "domain_name": "<Domain Name>",
  "redirect_domain_name": "[Redirect Domain Name]"
}
```

Key: `<Required>, [Optional]`

## Preview (localhost):
Run `localhost-static-website`

## Deploy
Run `aws-static-website`

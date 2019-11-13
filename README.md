Serves a static website and optionally redirects a subdomain like www to it.

## Usage

### Setup
Create an `.npmrc` file that looks like:

```
aws_profile=<Profile Name>
domain_name=<Domain Name>
redirect_domain_name=[Redirect Domain Name]
```

Key: `<Required>, [Optional]`

## Deploy
Run `npm run deploy`

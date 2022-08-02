# DDB Partition load test

## Deploy
```
npx cdk bootstrap --region us-east-1
npx cdk deploy
```

## Usage
After a successful deployment, please invoke a Lambda instance with the following event:

```json
{
    "maxDepth": 3
}
```

You can adjust `maxDepth` for the desired level of load.

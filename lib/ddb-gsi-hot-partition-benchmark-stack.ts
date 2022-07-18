import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export class DdbGsiHotPartitionBenchmarkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const withSk = new Table(this, 'WithSk', {
      partitionKey: { name: 'PK', type: AttributeType.STRING },
      sortKey: { name: 'SK', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const withGsi = new Table(this, 'WithGsi', {
      partitionKey: { name: 'PK', type: AttributeType.STRING },
      sortKey: { name: 'SK', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    withGsi.addGlobalSecondaryIndex({
      indexName: 'GSI',
      partitionKey: { name: 'GSI', type: AttributeType.STRING },
    });

    const control = new Table(this, 'Control', {
      partitionKey: { name: 'PK', type: AttributeType.STRING },
      sortKey: { name: 'SK', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const withSkHandler = new NodejsFunction(this, 'WithSkHandler', {
      entry: 'lambda/index.ts',
      functionName: 'withSkHandler',
      environment: {
        TARGET_TABLE: withSk.tableName,
        SELF_FUNCTION_NAME: 'withSkHandler',
        MODE: 'withSk',
      },
      timeout: Duration.seconds(120),
    });

    withSk.grantWriteData(withSkHandler);
    withSkHandler.addToRolePolicy(
      new PolicyStatement({
        actions: ['lambda:InvokeFunction'],
        resources: ['*'],
      })
    );


    const withGsiHandler = new NodejsFunction(this, 'WithGsiHandler', {
      entry: 'lambda/index.ts',
      functionName: 'withGsiHandler',
      environment: {
        TARGET_TABLE: withGsi.tableName,
        SELF_FUNCTION_NAME: 'withGsiHandler',
        MODE: 'withGsi',
      },
      timeout: Duration.seconds(120),
    });

    withGsi.grantWriteData(withGsiHandler);
    withGsiHandler.addToRolePolicy(
      new PolicyStatement({
        actions: ['lambda:InvokeFunction'],
        resources: ['*'],
      })
    );
  }
}

#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DdbGsiHotPartitionBenchmarkStack } from '../lib/ddb-gsi-hot-partition-benchmark-stack';

const app = new cdk.App();
new DdbGsiHotPartitionBenchmarkStack(app, 'DdbGsiHotPartitionBenchmarkStack', {
  env: { region: 'us-east-1' },
});

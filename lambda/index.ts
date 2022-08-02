import { DynamoDB, Lambda } from 'aws-sdk';
import { createMetricsLogger, Unit } from 'aws-embedded-metrics';

const ddb = new DynamoDB.DocumentClient({ maxRetries: 0 });
const lambda = new Lambda();

const SELF_FUNCTION_NAME = process.env.SELF_FUNCTION_NAME!;
const TARGET_TABLE = process.env.TARGET_TABLE!;
const mode = process.env.MODE!;

type Event = {
  depth?: number;
  fixedPk?: string;
  maxDepth?: number;
};

export const handler = async (event: Event) => {
  console.log(event);
  const maxRunSeconds = 95 + Math.random() * 20;
  const logIntervalSeconds = 30;
  const startedAt = Date.now();
  const metrics = createMetricsLogger();
  metrics.putDimensions({ Mode: mode });
  metrics.setNamespace('DdbHotPartitionBenchmark');

  let lastLoggedAt = Date.now();
  let total = 0;
  let error = 0;
  const {
    depth = 0,
    maxDepth = 2, // 2**2=4で負荷掛ける
    fixedPk = `PK#${Math.random().toString()}`,
  } = event;

  if (depth < maxDepth) {
    for (let i = 0; i < 2; i++) {
      await lambda
        .invoke({
          FunctionName: SELF_FUNCTION_NAME,
          InvocationType: 'Event',
          Payload: JSON.stringify({ depth: depth + 1, fixedPk, maxDepth }),
        })
        .promise();
    }
    return;
  }

  while (true) {
    total++;
    try {
      await ddb
        .put({
          TableName: TARGET_TABLE,
          Item: {
            // withSk のときはPKを固定する
            PK: mode == 'withSk' ? fixedPk : Math.random().toString(),
            SK: Math.random().toString(),
            GSI: fixedPk,
            LSI: Math.random().toString(),
          },
        })
        .promise();
    } catch (e) {
      // console.log(e);
      error += 1;
    }

    if (Date.now() - lastLoggedAt > logIntervalSeconds * 1000) {
      metrics.putMetric('ErrorCount', error, Unit.Count);
      metrics.putMetric('TotalWriteCount', total, Unit.Count);
      total = 0;
      error = 0;
      lastLoggedAt = Date.now();
      metrics.flush();
    }
    if (Date.now() - startedAt > maxRunSeconds * 1000) {
      break;
    }
  }

  if (total != 0) {
    metrics.putMetric('ErrorCount', error, Unit.Count);
    metrics.putMetric('TotalWriteCount', total, Unit.Count);
    total = 0;
    error = 0;
    lastLoggedAt = Date.now();
    await metrics.flush();
  }

  // 処理継続
  await lambda
    .invoke({
      FunctionName: SELF_FUNCTION_NAME,
      InvocationType: 'Event',
      Payload: JSON.stringify({ depth: depth + 1, fixedPk, maxDepth }),
    })
    .promise();
};

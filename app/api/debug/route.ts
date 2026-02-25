import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    DYNAMODB_REGION:        process.env.DYNAMODB_REGION,
    DYNAMODB_TABLE_CONDOS:  process.env.DYNAMODB_TABLE_CONDOS,
    DYNAMODB_TABLE_UNITS:   process.env.DYNAMODB_TABLE_UNITS,
    DYNAMODB_TABLE_AGENDAS: process.env.DYNAMODB_TABLE_AGENDAS,
    DYNAMODB_TABLE_VOTES:   process.env.DYNAMODB_TABLE_VOTES,
    AWS_REGION:             process.env.AWS_REGION,
    AWS_LAMBDA_FUNCTION_NAME: process.env.AWS_LAMBDA_FUNCTION_NAME,
  });
}

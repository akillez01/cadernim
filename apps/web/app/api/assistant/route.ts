import { NextRequest, NextResponse } from "next/server";
import {
  answerPedagogicalQuestion,
  generatePedagogicalRecommendations,
  type HymnContext,
  type StudentLevel
} from "@cadernim/pedagogical-assistant";
import { getAuthUserFromRequest } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { badRequest, serverError, unauthorized } from "@/lib/http";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return unauthorized();
    }

    const body = await request.json();
    const context = body.context as HymnContext | undefined;
    const level = (body.level as StudentLevel | undefined) ?? "beginner";
    const question = (body.question as string | undefined)?.trim();
    const hymnId = body.hymnId as string | undefined;

    if (!context) {
      return badRequest("Contexto do hino e obrigatorio.");
    }

    const result = generatePedagogicalRecommendations(context, level);
    const answer = question ? answerPedagogicalQuestion(question, context, level) : undefined;

    if (hymnId) {
      await prisma.aIRecommendation.createMany({
        data: result.recommendations.slice(0, 3).map((item) => ({
          userId: user.id,
          hymnId,
          recommendationType: item.type,
          content: item.content
        }))
      });
    }

    return NextResponse.json({
      data: {
        ...result,
        answer
      }
    });
  } catch (error) {
    console.error(error);
    return serverError("Nao foi possivel gerar orientacao pedagogica.");
  }
}

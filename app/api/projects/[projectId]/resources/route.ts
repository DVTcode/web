import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { projectId } = await params;

    try {
        // 1. Check membership
        const membership = await prisma.projectMember.findUnique({
            where: {
                projectId_userId: {
                    projectId,
                    userId: session.user.id,
                },
            },
        });

        if (!membership) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        // 2. Get Project Lead ID
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { leadId: true },
        });

        if (!project) {
            return new NextResponse("Project not found", { status: 404 });
        }

        // 3. Fetch Project Comment Attachments (JSON)
        // Lấy tất cả rồi filter ở app-level vì attachments là JSON không so sánh null trong SQL dễ
        const projectComments = await prisma.projectComment.findMany({
            where: {
                projectId,
                // attachments có kiểu Json — bỏ filter DB, filter ở JS bên dưới
            },
            select: {
                id: true,
                attachments: true,
                createdAt: true,
                author: {
                    select: { name: true, email: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // 4. Fetch Task Attachments added by Project Lead
        let taskAttachments: any[] = [];
        if (project.leadId) {
            taskAttachments = await prisma.taskAttachment.findMany({
                where: {
                    task: { projectId },
                    addedById: project.leadId,
                },
                include: {
                    resource: true,
                    task: {
                        select: { title: true, id: true },
                    },
                    addedBy: {
                        select: { name: true, email: true },
                    },
                },
                orderBy: { addedAt: 'desc' },
            });
        }

        // 5. Normalize and Merge
        const resources = [
            ...projectComments.flatMap(c => {
                const atts = c.attachments as any[]; // Type assertion for JSON
                if (!Array.isArray(atts)) return [];
                return atts.map(att => ({
                    id: att.id,
                    name: att.name,
                    url: att.url,
                    type: 'PROJECT_COMMENT',
                    mimeType: att.mimeType,
                    size: att.size,
                    createdAt: c.createdAt,
                    authorName: c.author.name || c.author.email,
                    sourceId: c.id, // comment id
                    sourceTitle: "Bình luận dự án"
                }));
            }),
            ...taskAttachments.map(ta => ({
                id: ta.resource.id,
                name: ta.resource.name,
                url: ta.resource.url,
                type: 'TASK_ATTACHMENT',
                mimeType: ta.resource.mimeType,
                size: ta.resource.size,
                createdAt: ta.addedAt,
                authorName: ta.addedBy.name || ta.addedBy.email,
                sourceId: ta.task.id,
                sourceTitle: ta.task.title
            }))
        ];

        // Sort by Date DESC
        resources.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return NextResponse.json(resources);
    } catch (error) {
        console.error("[PROJECT_RESOURCES_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

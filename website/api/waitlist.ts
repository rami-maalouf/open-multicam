import { Client } from "@notionhq/client";

export const config = {
  runtime: "edge",
};

export default async function handler(request: Request) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { email, platform = "Android" } = await request.json();

    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const validPlatforms = ["iOS", "Android"];
    const normalizedPlatform = validPlatforms.includes(platform) ? platform : "Android";

    const notionApiKey = process.env.NOTION_API_KEY;
    const notionDataSourceId = process.env.NOTION_WAITLIST_DATASOURCE_ID;

    if (!notionApiKey) {
      console.error("NOTION_API_KEY environment variable not found.");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!notionDataSourceId) {
      console.error("NOTION_WAITLIST_DATASOURCE_ID environment variable not found.");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const notion = new Client({ auth: notionApiKey });

    const newPage = await notion.pages.create({
      parent: {
        type: "data_source_id",
        data_source_id: notionDataSourceId,
      },
      properties: {
        Email: {
          title: [
            {
              text: {
                content: email,
              },
            },
          ],
        },
        Date: {
          date: {
            start: new Date().toISOString(),
          },
        },
        Platform: {
          multi_select: [
            {
              name: normalizedPlatform,
            },
          ],
        },
        App: {
          multi_select: [
            {
              name: "openmulticam",
            },
          ],
        },
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        pageId: newPage.id,
        alreadyAdded: false,
        message: "Successfully joined the waitlist!",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Notion API error:", error);
    return new Response(
      JSON.stringify({
        error: `Failed to add email to waitlist: ${error instanceof Error ? error.message : "Unknown error"}`,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

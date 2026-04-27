export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { boardId, itemName, columnValues } = await req.json();

    const apiToken = process.env.MONDAY_API_TOKEN;

    if (!apiToken) {
      return new Response(JSON.stringify({ error: "Missing MONDAY_API_TOKEN" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const groupsQuery = `
      query GetGroups($boardIds: [ID!]) {
        boards(ids: $boardIds) {
          groups {
            id
            title
          }
        }
      }
    `;

    const groupsRes = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiToken,
      },
      body: JSON.stringify({
        query: groupsQuery,
        variables: {
          boardIds: [String(boardId)],
        },
      }),
    });

    const groupsResult = await groupsRes.json();
    const groups = groupsResult?.data?.boards?.[0]?.groups || [];

    const yardGroup = groups.find(
      (group) => group.title.trim().toLowerCase() === "yard daily report"
    );

    if (!yardGroup) {
      return new Response(
        JSON.stringify({
          error: "Could not find Yard Daily Report group.",
          availableGroups: groups,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const createItemQuery = `
      mutation CreateItem(
        $boardId: ID!,
        $groupId: String!,
        $itemName: String!,
        $columnValues: JSON!
      ) {
        create_item(
          board_id: $boardId,
          group_id: $groupId,
          item_name: $itemName,
          column_values: $columnValues
        ) {
          id
        }
      }
    `;

    const variables = {
      boardId: String(boardId),
      groupId: yardGroup.id,
      itemName,
      columnValues: JSON.stringify(columnValues),
    };

    const mondayRes = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiToken,
      },
      body: JSON.stringify({
        query: createItemQuery,
        variables,
      }),
    });

    const result = await mondayRes.json();

    if (!mondayRes.ok || result.errors) {
      return new Response(
        JSON.stringify({
          error: result.errors?.[0]?.message || "Failed to create item in Monday",
          details: result,
          groupUsed: yardGroup,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        data: result.data,
        groupUsed: yardGroup,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

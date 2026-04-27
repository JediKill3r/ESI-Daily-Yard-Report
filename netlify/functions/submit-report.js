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

    const createItemVariables = {
      boardId: String(boardId),
      groupId: yardGroup.id,
      itemName,
      columnValues: JSON.stringify(columnValues),
    };

    const itemRes = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiToken,
      },
      body: JSON.stringify({
        query: createItemQuery,
        variables: createItemVariables,
      }),
    });

    const itemResult = await itemRes.json();

    if (!itemRes.ok || itemResult.errors) {
      return new Response(
        JSON.stringify({
          error: itemResult.errors?.[0]?.message || "Failed to create item in Monday",
          details: itemResult,
          groupUsed: yardGroup,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const itemId = itemResult?.data?.create_item?.id;

    const updateBody = columnValues?.text || "Daily Yard Report submitted.";

    const createUpdateQuery = `
      mutation CreateUpdate($itemId: ID!, $body: String!) {
        create_update(item_id: $itemId, body: $body) {
          id
        }
      }
    `;

    const updateRes = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiToken,
      },
      body: JSON.stringify({
        query: createUpdateQuery,
        variables: {
          itemId: String(itemId),
          body: updateBody,
        },
      }),
    });

    const updateResult = await updateRes.json();

    if (!updateRes.ok || updateResult.errors) {
      return new Response(
        JSON.stringify({
          error:
            updateResult.errors?.[0]?.message ||
            "Item created, but failed to create update.",
          details: updateResult,
          itemId,
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
        itemId,
        updateId: updateResult?.data?.create_update?.id,
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

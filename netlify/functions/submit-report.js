export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { boardId, groupId, itemName, columnValues } = await req.json();

    const apiToken = process.env.MONDAY_API_TOKEN;
    if (!apiToken) {
      return new Response(JSON.stringify({ error: 'Missing MONDAY_API_TOKEN' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const createItemQuery = `
      mutation CreateItem($boardId: ID!, $groupId: String!, $itemName: String!, $columnValues: JSON!) {
        create_item(
          board_id: $boardId
          group_id: $groupId
          item_name: $itemName
          column_values: $columnValues
        ) {
          id
        }
      }
    `;

    const createItemVariables = {
      boardId,
      groupId,
      itemName,
      columnValues: JSON.stringify(columnValues),
    };

    const itemRes = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
          error: itemResult.errors?.[0]?.message || 'Failed to create item in Monday',
          details: itemResult,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const itemId = itemResult?.data?.create_item?.id;

    const updateBody = [
      `Daily Yard Report`,
      ``,
      `Location: ${columnValues.text || 'None'}`,
      ``,
      columnValues.projectManagementNotes || 'No report details provided.',
    ].join('\n');

    const createUpdateQuery = `
      mutation CreateUpdate($itemId: ID!, $body: String!) {
        create_update(item_id: $itemId, body: $body) {
          id
        }
      }
    `;

    const updateVariables = {
      itemId,
      body: updateBody,
    };

    const updateRes = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiToken,
      },
      body: JSON.stringify({
        query: createUpdateQuery,
        variables: updateVariables,
      }),
    });

    const updateResult = await updateRes.json();

    if (!updateRes.ok || updateResult.errors) {
      return new Response(
        JSON.stringify({
          error: updateResult.errors?.[0]?.message || 'Item created, but failed to create update',
          details: updateResult,
          itemId,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        itemId,
        updateId: updateResult?.data?.create_update?.id,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

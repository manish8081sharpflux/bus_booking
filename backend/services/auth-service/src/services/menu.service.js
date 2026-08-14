const { getMenuPool } = require('../infrastructure/database/postgres.connection');

class MenuService {
  async initialize() {
    const pool = getMenuPool();
    if (!pool) {
      console.warn('[auth-service] MENU_DATABASE_URL not set; using in-memory fallback menu');
      return;
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id BIGSERIAL PRIMARY KEY,
        parent_id BIGINT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
        title TEXT NULL,
        heading TEXT NULL,
        path TEXT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        disabled BOOLEAN NOT NULL DEFAULT FALSE,
        collapse BOOLEAN NOT NULL DEFAULT FALSE,
        collapse_title TEXT NULL,
        expand_title TEXT NULL,
        badge TEXT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS role_menu_items (
        role TEXT NOT NULL,
        menu_item_id BIGINT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (role, menu_item_id)
      );
    `);

    await this.seedDefaults(pool);
    await this.ensureBaselineMenuByRole(pool);
    await this.ensureRequiredEntries(pool);
  }

  async seedDefaults(pool) {
    const { rows } = await pool.query('SELECT COUNT(1)::int AS count FROM menu_items');
    const count = rows[0]?.count || 0;

    if (count > 0) {
      return;
    }

    const seedMenu = [
      { key: 'dashboard', title: 'Dashboards', path: '/', sortOrder: 10 },
      { key: 'user_heading', heading: 'User', sortOrder: 20 },
      { key: 'account', title: 'My Account', sortOrder: 30 },
      {
        key: 'account_profile',
        parentKey: 'account',
        title: 'User Profile',
        path: '/account/home/user-profile',
        sortOrder: 31
      },
      {
        key: 'account_settings',
        parentKey: 'account',
        title: 'Settings - With Sidebar',
        path: '/account/home/settings-sidebar',
        sortOrder: 32
      },
      { key: 'members', title: 'Members & Roles', sortOrder: 40 },
      {
        key: 'members_create',
        parentKey: 'members',
        title: 'Create User',
        path: '/account/members/create-user',
        sortOrder: 41
      },
  
      {
        key: 'members_roles',
        parentKey: 'members',
        title: 'Roles',
        path: '/account/members/roles',
        sortOrder: 44
      },
      { key: 'security', title: 'Security', sortOrder: 50 },
      {
        key: 'security_overview',
        parentKey: 'security',
        title: 'Security Overview',
        path: '/account/security/overview',
        sortOrder: 51
      },
      {
        key: 'security_log',
        parentKey: 'security',
        title: 'Security Log',
        path: '/account/security/security-log',
        sortOrder: 52
      }
    ];

    const insertedIds = new Map();

    for (const item of seedMenu.filter((entry) => !entry.parentKey)) {
      const result = await pool.query(
        `
          INSERT INTO menu_items (parent_id, title, heading, path, sort_order, disabled, collapse, collapse_title, expand_title, badge, is_active)
          VALUES (NULL, $1, $2, $3, $4, FALSE, FALSE, NULL, NULL, NULL, TRUE)
          RETURNING id
        `,
        [item.title || null, item.heading || null, item.path || null, item.sortOrder || 0],
      );
      insertedIds.set(item.key, result.rows[0].id);
    }

    for (const item of seedMenu.filter((entry) => entry.parentKey)) {
      const parentId = insertedIds.get(item.parentKey);
      const result = await pool.query(
        `
          INSERT INTO menu_items (parent_id, title, heading, path, sort_order, disabled, collapse, collapse_title, expand_title, badge, is_active)
          VALUES ($1, $2, $3, $4, $5, FALSE, FALSE, NULL, NULL, NULL, TRUE)
          RETURNING id
        `,
        [parentId, item.title || null, item.heading || null, item.path || null, item.sortOrder || 0],
      );
      insertedIds.set(item.key, result.rows[0].id);
    }

    const roleMap = {
      USER: ['dashboard', 'user_heading', 'account', 'account_profile', 'account_settings'],
      OPERATOR: [
        'dashboard',
        'user_heading',
        'account',
        'account_profile',
        'account_settings',
        'members',
        'members_operators',
        'members_team',
        'security',
        'security_log'
      ],
      ADMIN: [
        'dashboard',
        'user_heading',
        'account',
        'account_profile',
        'account_settings',
        'members',
        'members_create',
        'members_operators',
        'members_team',
        'members_roles',
        'security',
        'security_overview',
        'security_log'
      ]
    };

    for (const [role, keys] of Object.entries(roleMap)) {
      for (const key of keys) {
        const menuItemId = insertedIds.get(key);
        if (!menuItemId) continue;
        await pool.query(
          `
            INSERT INTO role_menu_items (role, menu_item_id)
            VALUES ($1, $2)
            ON CONFLICT (role, menu_item_id) DO NOTHING
          `,
          [role, menuItemId],
        );
      }
    }
  }

  async ensureRequiredEntries(pool) {
    const requiredEntries = [
      {
        title: 'Operators',
        path: '/account/members/operators',
        role: ['ADMIN', 'OPERATOR'],
        sortOrder: 43
      },
      {
        title: 'Add Operator',
        path: '/account/members/add-operator',
        role: ['ADMIN', 'OPERATOR'],
        sortOrder: 42
      }
    ];

    const membersParentResult = await pool.query(
      `
        SELECT id
        FROM menu_items
        WHERE parent_id IS NULL
          AND title = 'Members & Roles'
        ORDER BY id ASC
        LIMIT 1
      `,
    );

    const parentId = membersParentResult.rows[0]?.id;
    if (!parentId) {
      return;
    }

    for (const entry of requiredEntries) {
      const existingResult = await pool.query(
        `
          SELECT id
          FROM menu_items
          WHERE parent_id = $1
            AND path = $2
          LIMIT 1
        `,
        [parentId, entry.path],
      );

      let menuItemId = existingResult.rows[0]?.id;

      if (!menuItemId) {
        const insertResult = await pool.query(
          `
            INSERT INTO menu_items
              (parent_id, title, heading, path, sort_order, disabled, collapse, collapse_title, expand_title, badge, is_active)
            VALUES
              ($1, $2, NULL, $3, $4, FALSE, FALSE, NULL, NULL, NULL, TRUE)
            RETURNING id
          `,
          [parentId, entry.title, entry.path, entry.sortOrder],
        );
        menuItemId = insertResult.rows[0]?.id;
      }

      if (!menuItemId) {
        continue;
      }

      for (const role of entry.role) {
        await pool.query(
          `
            INSERT INTO role_menu_items (role, menu_item_id)
            VALUES ($1, $2)
            ON CONFLICT (role, menu_item_id) DO NOTHING
          `,
          [role, menuItemId],
        );
      }
    }
  }

  async ensureBaselineMenuByRole(pool) {
    const ensureRootNode = async ({ title = null, heading = null, sortOrder = 0 }) => {
      const existing = await pool.query(
        `
          SELECT id
          FROM menu_items
          WHERE parent_id IS NULL
            AND COALESCE(title, '') = COALESCE($1, '')
            AND COALESCE(heading, '') = COALESCE($2, '')
          ORDER BY id ASC
          LIMIT 1
        `,
        [title, heading],
      );

      if (existing.rows[0]?.id) {
        return existing.rows[0].id;
      }

      const inserted = await pool.query(
        `
          INSERT INTO menu_items
            (parent_id, title, heading, path, sort_order, disabled, collapse, collapse_title, expand_title, badge, is_active)
          VALUES
            (NULL, $1, $2, NULL, $3, FALSE, FALSE, NULL, NULL, NULL, TRUE)
          RETURNING id
        `,
        [title, heading, sortOrder],
      );

      return inserted.rows[0].id;
    };

    const ensurePathNode = async ({ parentId = null, title, path, sortOrder = 0 }) => {
      const existing = await pool.query(
        `
          SELECT id
          FROM menu_items
          WHERE COALESCE(parent_id, 0) = COALESCE($1, 0)
            AND path = $2
          ORDER BY id ASC
          LIMIT 1
        `,
        [parentId, path],
      );

      if (existing.rows[0]?.id) {
        return existing.rows[0].id;
      }

      const inserted = await pool.query(
        `
          INSERT INTO menu_items
            (parent_id, title, heading, path, sort_order, disabled, collapse, collapse_title, expand_title, badge, is_active)
          VALUES
            ($1, $2, NULL, $3, $4, FALSE, FALSE, NULL, NULL, NULL, TRUE)
          RETURNING id
        `,
        [parentId, title, path, sortOrder],
      );

      return inserted.rows[0].id;
    };

    const ensureRoleMapping = async (role, menuItemId) => {
      await pool.query(
        `
          INSERT INTO role_menu_items (role, menu_item_id)
          VALUES ($1, $2)
          ON CONFLICT (role, menu_item_id) DO NOTHING
        `,
        [role, menuItemId],
      );
    };

    const dashboardId = await ensurePathNode({
      title: 'Dashboards',
      path: '/',
      sortOrder: 10
    });
    const userHeadingId = await ensureRootNode({ heading: 'User', sortOrder: 20 });
    const accountId = await ensureRootNode({ title: 'My Account', sortOrder: 30 });
    const profileId = await ensurePathNode({
      parentId: accountId,
      title: 'User Profile',
      path: '/account/home/user-profile',
      sortOrder: 31
    });
    const settingsId = await ensurePathNode({
      parentId: accountId,
      title: 'Settings - With Sidebar',
      path: '/account/home/settings-sidebar',
      sortOrder: 32
    });
    const membersId = await ensureRootNode({ title: 'Members & Roles', sortOrder: 40 });
    const createUserId = await ensurePathNode({
      parentId: membersId,
      title: 'Create User',
      path: '/account/members/create-user',
      sortOrder: 41
    });
    const addOperatorId = await ensurePathNode({
      parentId: membersId,
      title: 'Add Operator',
      path: '/account/members/add-operator',
      sortOrder: 42
    });
    const operatorsId = await ensurePathNode({
      parentId: membersId,
      title: 'Operators',
      path: '/account/members/operators',
      sortOrder: 43
    });
    const rolesId = await ensurePathNode({
      parentId: membersId,
      title: 'Roles',
      path: '/account/members/roles',
      sortOrder: 44
    });
    const securityId = await ensureRootNode({ title: 'Security', sortOrder: 50 });
    const securityOverviewId = await ensurePathNode({
      parentId: securityId,
      title: 'Security Overview',
      path: '/account/security/overview',
      sortOrder: 51
    });
    const securityLogId = await ensurePathNode({
      parentId: securityId,
      title: 'Security Log',
      path: '/account/security/security-log',
      sortOrder: 52
    });

    const mappingByRole = {
      USER: [dashboardId, userHeadingId, accountId, profileId, settingsId],
      OPERATOR: [
        dashboardId,
        userHeadingId,
        accountId,
        profileId,
        settingsId,
        membersId,
        operatorsId,
        addOperatorId,
        securityId,
        securityLogId
      ],
      ADMIN: [
        dashboardId,
        userHeadingId,
        accountId,
        profileId,
        settingsId,
        membersId,
        createUserId,
        operatorsId,
        addOperatorId,
        rolesId,
        securityId,
        securityOverviewId,
        securityLogId
      ]
    };

    for (const [role, menuItemIds] of Object.entries(mappingByRole)) {
      for (const id of menuItemIds) {
        await ensureRoleMapping(role, id);
      }
    }
  }

  async getMenuByRole(role = 'USER') {
    const pool = getMenuPool();
    if (!pool) {
      return [];
    }

    const normalizedRole = String(role || 'USER').toUpperCase();

    const { rows } = await pool.query(
      `
        WITH RECURSIVE role_nodes AS (
          SELECT mi.*
          FROM menu_items mi
          INNER JOIN role_menu_items rmi ON rmi.menu_item_id = mi.id
          WHERE UPPER(rmi.role) = $1
            AND mi.is_active = TRUE
        ),
        tree AS (
          SELECT * FROM role_nodes
          UNION
          SELECT parent.*
          FROM menu_items parent
          INNER JOIN tree child ON child.parent_id = parent.id
          WHERE parent.is_active = TRUE
        )
        SELECT DISTINCT
          id,
          parent_id,
          title,
          heading,
          path,
          sort_order,
          disabled,
          collapse,
          collapse_title,
          expand_title,
          badge
        FROM tree
        ORDER BY parent_id NULLS FIRST, sort_order, id
      `,
      [normalizedRole],
    );

    return this.buildTree(rows);
  }

  async getMenuDebugByRole(role = 'USER') {
    const pool = getMenuPool();
    const normalizedRole = String(role || 'USER').toUpperCase();

    if (!pool) {
      return {
        dbEnabled: false,
        normalizedRole,
        message: 'MENU_DATABASE_URL is not configured'
      };
    }

    const [menuItemsCount, roleMenuItemsCount, roleMappings, rawTreeRows] =
      await Promise.all([
        pool.query('SELECT COUNT(*)::INT AS count FROM menu_items'),
        pool.query('SELECT COUNT(*)::INT AS count FROM role_menu_items'),
        pool.query(
          `
            SELECT
              rmi.role,
              rmi.menu_item_id,
              mi.title,
              mi.heading,
              mi.path,
              mi.parent_id,
              mi.is_active
            FROM role_menu_items rmi
            INNER JOIN menu_items mi ON mi.id = rmi.menu_item_id
            WHERE UPPER(rmi.role) = $1
            ORDER BY mi.sort_order, mi.id
          `,
          [normalizedRole],
        ),
        pool.query(
          `
            WITH RECURSIVE role_nodes AS (
              SELECT mi.*
              FROM menu_items mi
              INNER JOIN role_menu_items rmi ON rmi.menu_item_id = mi.id
              WHERE UPPER(rmi.role) = $1
                AND mi.is_active = TRUE
            ),
            tree AS (
              SELECT * FROM role_nodes
              UNION
              SELECT parent.*
              FROM menu_items parent
              INNER JOIN tree child ON child.parent_id = parent.id
              WHERE parent.is_active = TRUE
            )
            SELECT DISTINCT
              id,
              parent_id,
              title,
              heading,
              path,
              sort_order,
              is_active
            FROM tree
            ORDER BY parent_id NULLS FIRST, sort_order, id
          `,
          [normalizedRole],
        )
      ]);

    const builtMenu = this.buildTree(rawTreeRows.rows || []);

    return {
      dbEnabled: true,
      normalizedRole,
      stats: {
        menuItemsCount: menuItemsCount.rows[0]?.count || 0,
        roleMenuItemsCount: roleMenuItemsCount.rows[0]?.count || 0,
        roleMappingsCount: roleMappings.rows.length,
        rawTreeRowsCount: rawTreeRows.rows.length,
        builtMenuRootCount: builtMenu.length
      },
      roleMappings: roleMappings.rows,
      rawTreeRows: rawTreeRows.rows,
      builtMenu
    };
  }

  buildTree(rows = []) {
    const byId = new Map();
    const roots = [];

    for (const row of rows) {
      byId.set(String(row.id), {
        id: row.id,
        parentId: row.parent_id,
        sortOrder: row.sort_order || 0,
        node: {
          title: row.title || undefined,
          heading: row.heading || undefined,
          path: row.path || undefined,
          disabled: row.disabled || undefined,
          collapse: row.collapse || undefined,
          collapseTitle: row.collapse_title || undefined,
          expandTitle: row.expand_title || undefined,
          badge: row.badge || undefined
        },
        children: []
      });
    }

    for (const entry of byId.values()) {
      if (!entry.parentId) {
        roots.push(entry);
        continue;
      }

      const parent = byId.get(String(entry.parentId));
      if (parent) {
        parent.children.push(entry);
      } else {
        roots.push(entry);
      }
    }

    const toMenu = (entries) =>
      entries
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((entry) => {
          const item = { ...entry.node };
          if (entry.children.length > 0) {
            item.children = toMenu(entry.children);
          }
          return item;
        })
        .filter((item) => item.title || item.heading);

    return toMenu(roots);
  }
}

module.exports = new MenuService();

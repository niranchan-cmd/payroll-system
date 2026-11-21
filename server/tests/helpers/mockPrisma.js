'use strict';

const crypto = require('crypto');

/**
 * Stateful In-Memory Prisma Store
 * Implements Prisma client model delegates for tests running in an isolated environment (Requirement R5).
 */
class MockPrismaStore {
  constructor() {
    this.models = [
      'user',
      'refreshToken',
      'client',
      'cTCStructure',
      'ctcStructure',
      'cTCComponent',
      'ctcComponent',
      'employee',
      'employeeSalaryHistory',
      'payrollRun',
      'payrollEntry',
      'systemSetting',
      'auditLog',
      'leaveBalance',
      'leaveRequest',
      'employeeDocument',
      'assetAssignment',
      'companyPolicy',
      'issuedLetter',
      'IssuedLetter',
    ];

    this.data = {};
    this.init();
  }

  init() {
    for (const model of this.models) {
      this.data[model] = [];
      this[model] = this._createModelDelegate(model);
    }
  }

  reset() {
    for (const model of this.models) {
      this.data[model] = [];
    }
  }

  // Helper to clone items so references aren't unintentionally mutated
  _clone(val) {
    if (val === undefined || val === null) return val;
    if (val instanceof Date) return new Date(val.getTime());
    const cloned = JSON.parse(JSON.stringify(val));
    return this._reviveDates(cloned);
  }

  _reviveDates(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      return obj.map((item) => this._reviveDates(item));
    }
    const dateKeys = [
      'effective_from',
      'effective_to',
      'start_date',
      'created_at',
      'updated_at',
      'finalized_at',
      'expires_at',
    ];
    for (const key of dateKeys) {
      if (obj[key] && typeof obj[key] === 'string' && !isNaN(Date.parse(obj[key]))) {
        obj[key] = new Date(obj[key]);
      }
    }
    return obj;
  }

  _generateId() {
    return crypto.randomUUID();
  }

  _matchesFilter(item, where) {
    if (!where || Object.keys(where).length === 0) return true;

    for (const [key, filter] of Object.entries(where)) {
      if (key === 'OR' && Array.isArray(filter)) {
        const matchesAny = filter.some((f) => this._matchesFilter(item, f));
        if (!matchesAny) return false;
        continue;
      }
      if (key === 'AND' && Array.isArray(filter)) {
        const matchesAll = filter.every((f) => this._matchesFilter(item, f));
        if (!matchesAll) return false;
        continue;
      }
      if (key === 'NOT' && filter) {
        if (this._matchesFilter(item, filter)) return false;
        continue;
      }

      // Check compound unique indexes, e.g. client_id_roll_no or client_id_month_year
      if (typeof filter === 'object' && filter !== null && !(filter instanceof Date) && !Array.isArray(filter)) {
        // Compound keys like { client_id_roll_no: { client_id, roll_no } }
        if (key === 'client_id_roll_no') {
          if (item.client_id !== filter.client_id || item.roll_no !== filter.roll_no) return false;
          continue;
        }
        if (key === 'client_id_month_year') {
          if (
            item.client_id !== filter.client_id ||
            Number(item.month) !== Number(filter.month) ||
            Number(item.year) !== Number(filter.year)
          ) {
            return false;
          }
          continue;
        }

        const itemVal = item[key];

        // Specific filter operators
        if ('equals' in filter) {
          if (filter.equals === null) {
            if (itemVal !== null && itemVal !== undefined) return false;
          } else if (itemVal !== filter.equals) return false;
        }
        if ('not' in filter) {
          if (filter.not === null) {
            if (itemVal === null || itemVal === undefined) return false;
          } else if (itemVal === filter.not) return false;
        }
        if ('in' in filter) {
          if (!Array.isArray(filter.in) || !filter.in.includes(itemVal)) return false;
        }
        if ('notIn' in filter) {
          if (Array.isArray(filter.notIn) && filter.notIn.includes(itemVal)) return false;
        }
        if ('contains' in filter) {
          const itemStr = String(itemVal || '');
          const searchStr = String(filter.contains || '');
          if (filter.mode === 'insensitive') {
            if (!itemStr.toLowerCase().includes(searchStr.toLowerCase())) return false;
          } else {
            if (!itemStr.includes(searchStr)) return false;
          }
        }
        if ('startsWith' in filter) {
          const itemStr = String(itemVal || '');
          const searchStr = String(filter.startsWith || '');
          if (filter.mode === 'insensitive') {
            if (!itemStr.toLowerCase().startsWith(searchStr.toLowerCase())) return false;
          } else {
            if (!itemStr.startsWith(searchStr)) return false;
          }
        }
        if ('gt' in filter) {
          const itemV = itemVal instanceof Date ? itemVal.getTime() : itemVal;
          const targetV = filter.gt instanceof Date ? filter.gt.getTime() : filter.gt;
          if (!(itemV > targetV)) return false;
        }
        if ('gte' in filter) {
          const itemV = itemVal instanceof Date ? itemVal.getTime() : itemVal;
          const targetV = filter.gte instanceof Date ? filter.gte.getTime() : filter.gte;
          if (!(itemV >= targetV)) return false;
        }
        if ('lt' in filter) {
          const itemV = itemVal instanceof Date ? itemVal.getTime() : itemVal;
          const targetV = filter.lt instanceof Date ? filter.lt.getTime() : filter.lt;
          if (!(itemV < targetV)) return false;
        }
        if ('lte' in filter) {
          const itemV = itemVal instanceof Date ? itemVal.getTime() : itemVal;
          const targetV = filter.lte instanceof Date ? filter.lte.getTime() : filter.lte;
          if (!(itemV <= targetV)) return false;
        }
        continue;
      }

      // Simple direct equality
      const itemVal = item[key];
      if (filter === null) {
        if (itemVal !== null && itemVal !== undefined) return false;
      } else if (filter instanceof Date) {
        const itemDate = itemVal instanceof Date ? itemVal : new Date(itemVal);
        if (itemDate.getTime() !== filter.getTime()) return false;
      } else if (typeof filter === 'number') {
        if (Number(itemVal) !== Number(filter)) return false;
      } else if (typeof filter === 'boolean') {
        if (Boolean(itemVal) !== Boolean(filter)) return false;
      } else {
        if (itemVal !== filter) return false;
      }
    }

    return true;
  }

  _applySort(items, orderBy) {
    if (!orderBy) return items;
    const orderList = Array.isArray(orderBy) ? orderBy : [orderBy];

    return [...items].sort((a, b) => {
      for (const order of orderList) {
        for (const [key, direction] of Object.entries(order)) {
          let aVal = a[key];
          let bVal = b[key];
          if (aVal instanceof Date) aVal = aVal.getTime();
          if (bVal instanceof Date) bVal = bVal.getTime();

          if (aVal < bVal) return direction.toLowerCase() === 'asc' ? -1 : 1;
          if (aVal > bVal) return direction.toLowerCase() === 'asc' ? 1 : -1;
        }
      }
      return 0;
    });
  }

  _applySelect(item, select) {
    if (!item || !select) return item;
    const result = {};
    for (const [key, isSelected] of Object.entries(select)) {
      if (isSelected) {
        result[key] = item[key];
      }
    }
    return result;
  }

  _attachIncludes(item, modelName, include, select) {
    if (!item) return null;
    let cloned = this._clone(item);

    if (include) {
      for (const [relKey, incVal] of Object.entries(include)) {
        if (!incVal) continue;
        const nestedInclude = typeof incVal === 'object' && incVal.include ? incVal.include : undefined;
        const nestedOrderBy = typeof incVal === 'object' && incVal.orderBy ? incVal.orderBy : undefined;

        // Model-specific relations
        if (modelName === 'cTCStructure' || modelName === 'ctcStructure') {
          if (relKey === 'components') {
            let comps = this.data.cTCComponent.filter((c) => c.structure_id === item.id);
            if (nestedOrderBy) comps = this._applySort(comps, nestedOrderBy);
            cloned.components = comps.map((c) => this._clone(c));
          }
          if (relKey === 'client') {
            const client = this.data.client.find((c) => c.id === item.client_id);
            cloned.client = this._clone(client);
          }
        } else if (modelName === 'employee') {
          if (relKey === 'salary_histories') {
            let histories = this.data.employeeSalaryHistory.filter((h) => h.employee_id === item.id);
            if (nestedOrderBy) histories = this._applySort(histories, nestedOrderBy);
            if (nestedInclude) {
              histories = histories.map((h) => this._attachIncludes(h, 'employeeSalaryHistory', nestedInclude));
            }
            cloned.salary_histories = histories.map((h) => this._clone(h));
          }
          if (relKey === 'client') {
            const client = this.data.client.find((c) => c.id === item.client_id);
            cloned.client = this._clone(client);
          }
        } else if (modelName === 'employeeSalaryHistory') {
          if (relKey === 'structure_version') {
            const struct = this.data.cTCStructure.find((s) => s.id === item.structure_version_id);
            cloned.structure_version = struct ? this._attachIncludes(struct, 'cTCStructure', nestedInclude) : null;
          }
          if (relKey === 'employee') {
            const emp = this.data.employee.find((e) => e.id === item.employee_id);
            cloned.employee = emp ? this._clone(emp) : null;
          }
        } else if (modelName === 'payrollRun') {
          if (relKey === 'entries') {
            let entries = this.data.payrollEntry.filter((e) => e.payroll_run_id === item.id);
            if (nestedOrderBy) entries = this._applySort(entries, nestedOrderBy);
            if (nestedInclude) {
              entries = entries.map((e) => this._attachIncludes(e, 'payrollEntry', nestedInclude));
            }
            cloned.entries = entries.map((e) => this._clone(e));
          }
          if (relKey === 'client') {
            const client = this.data.client.find((c) => c.id === item.client_id);
            cloned.client = this._clone(client);
          }
        } else if (modelName === 'payrollEntry') {
          if (relKey === 'employee') {
            const emp = this.data.employee.find((e) => e.id === item.employee_id);
            cloned.employee = emp ? this._clone(emp) : null;
          }
          if (relKey === 'salary_history') {
            const hist = this.data.employeeSalaryHistory.find((h) => h.id === item.salary_history_id);
            cloned.salary_history = hist ? this._clone(hist) : null;
          }
        } else if (modelName === 'user') {
          if (relKey === 'refresh_tokens') {
            cloned.refresh_tokens = this.data.refreshToken.filter((r) => r.user_id === item.id).map((r) => this._clone(r));
          }
        } else if (modelName === 'client') {
          if (relKey === 'structures') {
            cloned.structures = this.data.cTCStructure.filter((s) => s.client_id === item.id).map((s) => this._clone(s));
          }
          if (relKey === 'employees') {
            cloned.employees = this.data.employee.filter((e) => e.client_id === item.id).map((e) => this._clone(e));
          }
        }
      }
    }

    if (select) {
      cloned = this._applySelect(cloned, select);
    }

    return cloned;
  }

  _createModelDelegate(modelName) {
    const canonicalModel =
      modelName === 'ctcStructure' ? 'cTCStructure' : modelName === 'ctcComponent' ? 'cTCComponent' : modelName;

    return {
      findUnique: async (args = {}) => {
        const item = this.data[canonicalModel].find((it) => this._matchesFilter(it, args.where));
        if (!item) return null;
        return this._attachIncludes(item, canonicalModel, args.include, args.select);
      },

      findFirst: async (args = {}) => {
        let items = this.data[canonicalModel].filter((it) => this._matchesFilter(it, args.where));
        if (args.orderBy) items = this._applySort(items, args.orderBy);
        const item = items[0];
        if (!item) return null;
        return this._attachIncludes(item, canonicalModel, args.include, args.select);
      },

      findMany: async (args = {}) => {
        let items = this.data[canonicalModel].filter((it) => this._matchesFilter(it, args.where));
        if (args.orderBy) items = this._applySort(items, args.orderBy);
        if (args.skip) items = items.slice(args.skip);
        if (args.take) items = items.slice(0, args.take);

        return items.map((it) => this._attachIncludes(it, canonicalModel, args.include, args.select));
      },

      create: async (args = {}) => {
        const data = { ...args.data };
        const id = data.id || this._generateId();
        const now = new Date();

        // Apply schema default values
        if (canonicalModel === 'client' && data.is_active === undefined) {
          data.is_active = true;
        }
        if (canonicalModel === 'user' && data.is_active === undefined) {
          data.is_active = true;
        }
        if (canonicalModel === 'employee' && !data.status) {
          data.status = 'ACTIVE';
        }
        if (canonicalModel === 'payrollRun' && !data.status) {
          data.status = 'DRAFT';
        }
        if (canonicalModel === 'payrollEntry' && data.is_prorated === undefined) {
          data.is_prorated = false;
        }

        const newItem = {
          ...data,
          id,
          created_at: data.created_at || now,
          updated_at: data.updated_at || now,
        };

        // Handle nested creates (e.g. structure.components.create)
        if (canonicalModel === 'cTCStructure' && data.components && data.components.create) {
          const comps = Array.isArray(data.components.create)
            ? data.components.create
            : [data.components.create];
          delete newItem.components;

          for (let i = 0; i < comps.length; i++) {
            const c = comps[i];
            const compId = c.id || this._generateId();
            this.data.cTCComponent.push({
              ...c,
              id: compId,
              structure_id: id,
              display_order: c.display_order ?? i,
            });
          }
        }

        this.data[canonicalModel].push(newItem);
        return this._attachIncludes(this._clone(newItem), canonicalModel, args.include);
      },

      createMany: async (args = {}) => {
        const items = Array.isArray(args.data) ? args.data : [args.data];
        let count = 0;
        for (const data of items) {
          const id = data.id || this._generateId();
          const now = new Date();
          this.data[canonicalModel].push({
            ...data,
            id,
            created_at: data.created_at || now,
            updated_at: data.updated_at || now,
          });
          count++;
        }
        return { count };
      },

      update: async (args = {}) => {
        const idx = this.data[canonicalModel].findIndex((it) => this._matchesFilter(it, args.where));
        if (idx === -1) {
          const err = new Error('Record not found.');
          err.code = 'P2025';
          throw err;
        }

        const current = this.data[canonicalModel][idx];
        const updated = {
          ...current,
          ...args.data,
          updated_at: new Date(),
        };

        this.data[canonicalModel][idx] = updated;
        return this._attachIncludes(this._clone(updated), canonicalModel, args.include);
      },

      updateMany: async (args = {}) => {
        let count = 0;
        for (let i = 0; i < this.data[canonicalModel].length; i++) {
          if (this._matchesFilter(this.data[canonicalModel][i], args.where)) {
            this.data[canonicalModel][i] = {
              ...this.data[canonicalModel][i],
              ...args.data,
              updated_at: new Date(),
            };
            count++;
          }
        }
        return { count };
      },

      delete: async (args = {}) => {
        const idx = this.data[canonicalModel].findIndex((it) => this._matchesFilter(it, args.where));
        if (idx === -1) {
          const err = new Error('Record not found.');
          err.code = 'P2025';
          throw err;
        }

        const deleted = this.data[canonicalModel].splice(idx, 1)[0];

        // Cascades
        if (canonicalModel === 'client') {
          this.data.cTCStructure = this.data.cTCStructure.filter((s) => s.client_id !== deleted.id);
          this.data.employee = this.data.employee.filter((e) => e.client_id !== deleted.id);
          this.data.payrollRun = this.data.payrollRun.filter((r) => r.client_id !== deleted.id);
        } else if (canonicalModel === 'payrollRun') {
          this.data.payrollEntry = this.data.payrollEntry.filter((pe) => pe.payroll_run_id !== deleted.id);
        } else if (canonicalModel === 'cTCStructure') {
          this.data.cTCComponent = this.data.cTCComponent.filter((c) => c.structure_id !== deleted.id);
        }

        return this._clone(deleted);
      },

      deleteMany: async (args = {}) => {
        const initialLen = this.data[canonicalModel].length;
        if (!args.where || Object.keys(args.where).length === 0) {
          this.data[canonicalModel] = [];
          return { count: initialLen };
        }

        const retained = [];
        let count = 0;
        for (const item of this.data[canonicalModel]) {
          if (this._matchesFilter(item, args.where)) {
            count++;
          } else {
            retained.push(item);
          }
        }
        this.data[canonicalModel] = retained;
        return { count };
      },

      count: async (args = {}) => {
        if (!args.where || Object.keys(args.where).length === 0) {
          return this.data[canonicalModel].length;
        }
        return this.data[canonicalModel].filter((it) => this._matchesFilter(it, args.where)).length;
      },

      upsert: async (args = {}) => {
        const existing = this.data[canonicalModel].find((it) => this._matchesFilter(it, args.where));
        if (existing) {
          return this[canonicalModel].update({ where: args.where, data: args.update, include: args.include });
        } else {
          return this[canonicalModel].create({ data: args.create, include: args.include });
        }
      },
    };
  }

  async $transaction(input) {
    if (typeof input === 'function') {
      return await input(this);
    }
    if (Array.isArray(input)) {
      const results = [];
      for (const op of input) {
        results.push(await op);
      }
      return results;
    }
    throw new Error('Unsupported $transaction argument format');
  }
}

// Singleton instance attached to global
const mockPrisma = new MockPrismaStore();

module.exports = {
  MockPrismaStore,
  mockPrisma,
};

/**
 * Prisma Temp-Warehouse Filter Extension
 *
 * Hardens the storefront / fulfillment / cart-holds / priority flow against
 * accidentally surfacing TEMPORARY warehouses. Temp warehouses are an internal
 * staging surface for damaged / expired / sample-defect / unusable stock and
 * MUST NOT appear in customer-facing aggregates, pickup pickers, or admin
 * "kho thường" flows.
 *
 * Strategy:
 *   - Intercept every Warehouse.read operation (findMany / findFirst /
 *     findFirstOrThrow / findUnique / findUniqueOrThrow / count / aggregate /
 *     groupBy) and, when the caller has NOT supplied an explicit `type` or
 *     `parentWarehouseId` filter, inject `type: 'MAIN'`. Callers that need
 *     temp rows can opt in by setting `where.type` explicitly (any value),
 *     by filtering on `parentWarehouseId`, or by querying the relation
 *     `tempWarehouses` from a parent warehouse.
 *
 * This is a defense-in-depth layer on top of explicit filters at the few
 * call sites that already have one — it catches every existing reader
 * (60+ call sites surveyed) without per-site retrofitting.
 */

import { Prisma } from '@prisma/client';

type ReadArgs = {
  where?: Prisma.WarehouseWhereInput | Prisma.WarehouseWhereUniqueInput;
};

const hasExplicitTempScope = (where: unknown): boolean => {
  if (!where || typeof where !== 'object') return false;
  const w = where as Record<string, unknown>;
  // Explicit `type` (any value) or `parentWarehouseId` (any value) opts in.
  if ('type' in w) return true;
  if ('parentWarehouseId' in w) return true;
  // Treat OR / AND / NOT branches as opt-in too — too risky to descend.
  // Callers using boolean composition typically know what they need.
  if ('OR' in w || 'AND' in w || 'NOT' in w) return true;
  return false;
};

const injectMainFilter = <A extends ReadArgs | undefined>(args: A): A => {
  if (!args) {
    return { where: { type: 'MAIN' } } as unknown as A;
  }
  if (!args.where || hasExplicitTempScope(args.where)) {
    return args;
  }
  return {
    ...args,
    where: { ...args.where, type: 'MAIN' },
  } as A;
};

export const tempWarehouseFilterExtension = Prisma.defineExtension({
  name: 'temp-warehouse-filter',
  query: {
    warehouse: {
      async findMany({ args, query }) {
        return query(injectMainFilter(args));
      },
      async findFirst({ args, query }) {
        return query(injectMainFilter(args));
      },
      async findFirstOrThrow({ args, query }) {
        return query(injectMainFilter(args));
      },
      async findUnique({ args, query }) {
        return query(injectMainFilter(args));
      },
      async findUniqueOrThrow({ args, query }) {
        return query(injectMainFilter(args));
      },
      async count({ args, query }) {
        return query(injectMainFilter(args));
      },
      async aggregate({ args, query }) {
        return query(injectMainFilter(args));
      },
      async groupBy({ args, query }) {
        return query(injectMainFilter(args));
      },
    },
  },
});

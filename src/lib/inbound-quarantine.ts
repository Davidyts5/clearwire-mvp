const WIRE_VISIBILITY_PAGE_SIZE = 1000;

/** Return every wire released to a CFO/Controller at the supplied database cutoff. */
export async function getVisibleWireIds(
  supabase: any,
  companyId: string,
  visibleAtOrBefore: string,
): Promise<Set<string>> {
  const wireIds = new Set<string>();
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('wire_requests')
      .select('id')
      .eq('company_id', companyId)
      .lte('visible_after', visibleAtOrBefore)
      .order('id', { ascending: true })
      .range(offset, offset + WIRE_VISIBILITY_PAGE_SIZE - 1);

    if (error) throw error;
    const rows = data || [];
    for (const wire of rows) wireIds.add(wire.id);
    if (rows.length < WIRE_VISIBILITY_PAGE_SIZE) break;
    offset += WIRE_VISIBILITY_PAGE_SIZE;
  }

  return wireIds;
}

export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { withAuth, getAdminClient } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';
import { verifyCompanyChain } from '@/lib/audit-chain';

export const POST = withAuth([ROLES.AUDITOR, ROLES.CFO], async (req, ctx, auth) => {
  try {
    // Run the chain verification over the entire history (no date limits)
    // Verify the complete WORM chain, including events hidden from CFO/Controller read paths.
    const adminClient = await getAdminClient();
    const chainInfo = await verifyCompanyChain(adminClient, auth.companyId);
    
    return NextResponse.json({ 
      success: true, 
      data: {
        totalRecords: chainInfo.totalRecords,
        validCount: chainInfo.validCount,
        invalidCount: chainInfo.invalidIds.length,
        historicalPlaceholderCount: chainInfo.historicalPlaceholderCount,
        isTampered: chainInfo.invalidIds.length > 0
      } 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

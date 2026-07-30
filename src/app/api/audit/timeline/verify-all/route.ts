export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';
import { verifyCompanyChain } from '@/lib/audit-chain';

export const POST = withAuth([ROLES.AUDITOR, ROLES.CFO], async (req, ctx, auth) => {
  try {
    // Run the chain verification over the entire history (no date limits)
    const chainInfo = await verifyCompanyChain(auth.supabase, auth.companyId);
    
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

import { NextResponse } from 'next/server';
import {
  createPlanningFund,
  deletePlanningFund,
  getAllPlanningFunds,
  getAllFundAccounts,
  getPlanningFundsAnnualTarget,
  updatePlanningFund,
  type PlanningFund,
} from '@/lib/db';

function parseOptionalId(value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function summarize(planningFunds: PlanningFund[]) {
  const includedFunds = planningFunds.filter(fund => fund.includeInSavingsPlan !== false && fund.includeInSavingsPlan !== 0 && Number(fund.annualTarget) > 0);
  const totalAnnualTarget = includedFunds.reduce((sum, fund) => sum + Number(fund.annualTarget || 0), 0);
  const totalLinkedCash = planningFunds.reduce((sum, fund) => sum + Number(fund.linkedFundAmount || 0), 0);

  return {
    totalAnnualTarget,
    totalMonthlyContribution: totalAnnualTarget / 12,
    totalLinkedCash,
    totalGap: Math.max(0, totalAnnualTarget - totalLinkedCash),
    count: planningFunds.length,
  };
}

export async function GET() {
  try {
    const planningFunds = getAllPlanningFunds();

    return NextResponse.json({
      planningFunds,
      fundAccounts: getAllFundAccounts(),
      annualProjectionTarget: getPlanningFundsAnnualTarget(),
      summary: summarize(planningFunds),
    });
  } catch (error) {
    console.error('Error fetching planning funds:', error);
    return NextResponse.json({ error: 'Failed to fetch planning funds' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    const annualTarget = Number(data.annualTarget);

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!Number.isFinite(annualTarget) || annualTarget < 0) {
      return NextResponse.json({ error: 'Annual target must be a positive number' }, { status: 400 });
    }

    const id = createPlanningFund({
      name,
      annualTarget,
      targetDate: typeof data.targetDate === 'string' && data.targetDate ? data.targetDate : null,
      linkedFundAccountId: parseOptionalId(data.linkedFundAccountId),
      includeInSavingsPlan: data.includeInSavingsPlan !== false,
      isActive: data.isActive !== false,
      sortOrder: Number.isFinite(Number(data.sortOrder)) ? Number(data.sortOrder) : 0,
    });

    return NextResponse.json({ id, success: true });
  } catch (error) {
    console.error('Error creating planning fund:', error);
    return NextResponse.json({ error: 'Failed to create planning fund' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const id = Number(data.id);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Valid ID is required' }, { status: 400 });
    }

    const updateData: Partial<PlanningFund> = {};

    if (typeof data.name === 'string') updateData.name = data.name.trim();

    if (data.annualTarget !== undefined) {
      const annualTarget = Number(data.annualTarget);
      if (!Number.isFinite(annualTarget) || annualTarget < 0) {
        return NextResponse.json({ error: 'Annual target must be a positive number' }, { status: 400 });
      }
      updateData.annualTarget = annualTarget;
    }

    if (data.targetDate !== undefined) {
      updateData.targetDate = typeof data.targetDate === 'string' && data.targetDate ? data.targetDate : null;
    }

    if (data.linkedFundAccountId !== undefined) {
      updateData.linkedFundAccountId = parseOptionalId(data.linkedFundAccountId);
    }

    if (data.includeInSavingsPlan !== undefined) {
      updateData.includeInSavingsPlan = data.includeInSavingsPlan === true;
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive === true;
    }

    if (data.sortOrder !== undefined) {
      updateData.sortOrder = Number.isFinite(Number(data.sortOrder)) ? Number(data.sortOrder) : 0;
    }

    const success = updatePlanningFund(id, updateData);
    if (!success) {
      return NextResponse.json({ error: 'Planning fund not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating planning fund:', error);
    return NextResponse.json({ error: 'Failed to update planning fund' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Valid ID is required' }, { status: 400 });
    }

    const success = deletePlanningFund(id);
    if (!success) {
      return NextResponse.json({ error: 'Planning fund not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting planning fund:', error);
    return NextResponse.json({ error: 'Failed to delete planning fund' }, { status: 500 });
  }
}

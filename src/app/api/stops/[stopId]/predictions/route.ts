import { NextRequest, NextResponse } from 'next/server';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://vanbuscast-api-prod.up.railway.app';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stopId: string }> }
) {
  try {
    const { stopId } = await params;
    const apiUrl = `${API_URL}/api/v1/stops/${stopId}/predictions`;
    console.log('Fetching stop predictions from Railway API:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    console.log('Railway API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('Railway API error:', response.status, response.statusText, errorText);
      return NextResponse.json(
        {
          error: `API request failed: ${response.status} ${response.statusText}`,
          details: errorText || 'No error details',
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching stop predictions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stop predictions' },
      { status: 500 }
    );
  }
}

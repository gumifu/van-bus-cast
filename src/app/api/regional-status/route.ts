import { NextRequest, NextResponse } from 'next/server';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://vanbuscast-api-prod.up.railway.app';

export async function GET(request: NextRequest) {
  try {
    const apiUrl = `${API_URL}/api/v1/regional/status`;
    console.log('Fetching from Railway API:', apiUrl);
    console.log('API_URL:', API_URL);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // サーバー側からのリクエストなのでCORSの問題なし
      cache: 'no-store', // リアルタイムデータなのでキャッシュしない
    });

    console.log('Railway API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('Railway API error:', response.status, response.statusText, errorText);
      return NextResponse.json(
        {
          error: `API request failed: ${response.status} ${response.statusText}`,
          details: errorText || 'No error details',
          apiUrl: apiUrl
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching regional status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch regional status' },
      { status: 500 }
    );
  }
}

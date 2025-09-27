import { NextRequest, NextResponse } from 'next/server';

// 距離計算関数（ハヴァサイン公式）
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // 地球の半径（メートル）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// 周辺のデモバス停と駅を取得する関数
function getNearbyDemoStops(userLat: number, userLng: number, radius: number) {
  const allDemoStops = [
    // 指定された5つの駅のみ
    {
      StopNo: 1001,
      Name: "Waterfront Station",
      Latitude: 49.2856,
      Longitude: -123.1110,
      Routes: "Canada Line, Expo Line, SeaBus, West Coast Express",
      Type: "SkyTrain"
    },
    {
      StopNo: 1002,
      Name: "Burrard Station",
      Latitude: 49.2850,
      Longitude: -123.1200,
      Routes: "Expo Line",
      Type: "SkyTrain"
    },
    {
      StopNo: 1003,
      Name: "Granville Station",
      Latitude: 49.2831,
      Longitude: -123.1165,
      Routes: "Expo Line",
      Type: "SkyTrain"
    },
    {
      StopNo: 1004,
      Name: "Vancouver City Centre Station",
      Latitude: 49.2825,
      Longitude: -123.1186,
      Routes: "Canada Line",
      Type: "SkyTrain"
    },
    {
      StopNo: 1005,
      Name: "Stadium–Chinatown Station",
      Latitude: 49.2796,
      Longitude: -123.1098,
      Routes: "Expo Line",
      Type: "SkyTrain"
    }
  ];

  return allDemoStops.filter(stop => {
    const distance = calculateDistance(userLat, userLng, stop.Latitude, stop.Longitude);
    return distance <= radius;
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const useDemo = searchParams.get('demo') === 'true';
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius') || '500';
    const stationsOnly = searchParams.get('stations_only') === 'true';

    // 位置情報が提供されている場合は実際のAPIを優先
    if (lat && lng) {
      const apiKey = process.env.NEXT_PUBLIC_TRANSLINK_API_KEY;

      if (!apiKey) {
        return NextResponse.json(
          { error: 'Translink API key not found' },
          { status: 500 }
        );
      }

      try {
        const response = await fetch(
          `https://api.translink.ca/rttiapi/v1/stops?apikey=${apiKey}&lat=${lat}&long=${lng}&radius=${radius}`,
          {
            headers: {
              'Accept': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log(`Fetched ${data.length} bus stops from Translink API`);
          return NextResponse.json(data);
        } else {
          console.error('Translink API error:', response.status, response.statusText);
          // APIが失敗した場合はデモデータにフォールバック
          console.log('Falling back to demo data due to API error');
        }
      } catch (error) {
        console.error('Error calling Translink API:', error);
        // APIが失敗した場合はデモデータにフォールバック
        console.log('Falling back to demo data due to API error');
      }
    }

    // デモデータを使用する場合（APIが失敗した場合も含む）
    if (useDemo || (lat && lng)) {
      // 位置情報が提供されている場合は、その周辺のデモデータを返す
      if (lat && lng) {
        const userLat = parseFloat(lat);
        const userLng = parseFloat(lng);
        const searchRadius = parseInt(radius);

        // バンクーバー周辺のデモデータをフィルタリング
        const nearbyStops = getNearbyDemoStops(userLat, userLng, searchRadius);

        // 駅のみを返す場合
        if (stationsOnly) {
          const stations = nearbyStops.filter(stop => stop.Type && stop.Type !== 'Bus');
          console.log(`Returning ${stations.length} nearby demo stations`);
          return NextResponse.json(stations);
        }

        console.log(`Returning ${nearbyStops.length} nearby demo stops`);
        return NextResponse.json(nearbyStops);
      }

      const demoData = [
        {
          StopNo: 1001,
          Name: "Waterfront Station",
          Latitude: 49.2856,
          Longitude: -123.1110,
          Routes: "Canada Line, Expo Line, SeaBus, West Coast Express",
          Type: "SkyTrain"
        },
        {
          StopNo: 1002,
          Name: "Burrard Station",
          Latitude: 49.2850,
          Longitude: -123.1200,
          Routes: "Expo Line",
          Type: "SkyTrain"
        },
        {
          StopNo: 1003,
          Name: "Granville Station",
          Latitude: 49.2831,
          Longitude: -123.1165,
          Routes: "Expo Line",
          Type: "SkyTrain"
        },
        {
          StopNo: 1004,
          Name: "Vancouver City Centre Station",
          Latitude: 49.2825,
          Longitude: -123.1186,
          Routes: "Canada Line",
          Type: "SkyTrain"
        },
        {
          StopNo: 1005,
          Name: "Stadium–Chinatown Station",
          Latitude: 49.2796,
          Longitude: -123.1098,
          Routes: "Expo Line",
          Type: "SkyTrain"
        }
      ];

      return NextResponse.json(demoData);
    }

    // 位置情報が提供されていない場合は実際のAPIを試行
    const apiKey = process.env.NEXT_PUBLIC_TRANSLINK_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Translink API key not found' },
        { status: 500 }
      );
    }

    try {
      const response = await fetch(
        `https://api.translink.ca/rttiapi/v1/stops?apikey=${apiKey}`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log(`Fetched ${data.length} bus stops from Translink API`);
        return NextResponse.json(data);
      } else {
        console.error('Translink API error:', response.status, response.statusText);
        return NextResponse.json(
          { error: 'Failed to fetch bus stops' },
          { status: response.status }
        );
      }
    } catch (error) {
      console.error('Error calling Translink API:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching bus stops:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

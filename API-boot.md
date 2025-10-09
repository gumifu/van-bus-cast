# API・DB起動手順
## 概要
GitHubでプライベートなコンテナイメージリポジトリ（Container Registry）をプル（pull）するには、docker login コマンドでGitHubに認証し、その後に docker pull コマンドでイメージをダウンロードします。docker login で認証する際には、ユーザー名とパーソナルアクセストークン（PAT）を使用します。
## 手順1
GitHubのパーソナルアクセストークン（PAT）を生成する（まだ持っていない場合）。持っている場合はスキップしてよい。  
GitHubにアクセスし、[Settings] > [Developer settings] > [Personal access tokens] > [Tokens (classic)] の順に移動します。
[Generate new token] > [Tokens (classic)] をクリックし、必要なスコープ `read:packages` を選択してトークンを生成します。
生成されたトークンをコピーし、安全な場所に保管します。

## 手順2
Dockerにログインする:
ターミナルを開き、以下のコマンドを実行します。
```
docker login ghcr.io
```
このコマンドを実行すると、ユーザー名とパスワードの入力が求められます。

**ユーザー名**: GitHubのユーザー名を入力します。  
**パスワード**: GitHubのパスワードではなく、パーソナルアクセストークン（PAT）を入力します。

## 手順2
ログイン後、APIのログが出力されても良いディレクトリに `docker-compose.yml` を配置し、以下のコマンドを実行する。
```
docker-compose up
```
## 手順3
ログが落ち着いたら（10分程度かかる）起動完了。  
http://localhost:8000/api/v1/regional/status にアクセスすると以下のようなjsonが返ってくるはず。
```

  "timestamp": "2025-10-03 18:04:47",
  "total_regions": 21,
  "regions": [
    {
      "region_id": "bowen_island_municipality",
      "region_name": "Bowen Island Municipality",
      "region_type": "municipality",
      "status": "no_data",
      "avg_delay_minutes": null,
      "last_updated": null,
      "trip_count": 0,
      "center_lat": null,
      "center_lon": null
    },
    ...
```
https://vencoucer-bus-scienmce.vercel.app/  
本番アプリもlocalhostを参照しているので、データが変わっているはず。  

## その他
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **DBURL**: `postgres://postgres:postgres@localhost:5432/postgres`
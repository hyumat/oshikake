/**
 * Issue #148: チケット販売情報表示制御
 * 試合関連のヘルパー関数
 */

/**
 * 試合が過去かどうかを判定
 * @param matchDate - 試合日 (YYYY-MM-DD)
 * @returns true if past, false if future or today
 */
export function isPastMatch(matchDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // 今日の00:00:00

  const match = new Date(matchDate);
  match.setHours(0, 0, 0, 0);

  return match < today;
}

/**
 * チケット販売情報を表示すべきかどうかを判定
 * Issue #148: 未来試合のみ表示
 * 
 * @param matchDate - 試合日 (YYYY-MM-DD)
 * @param ticketSalesStart - チケット販売開始日 (YYYY-MM-DD | null)
 * @returns true if should show ticket info, false otherwise
 */
export function shouldShowTicketInfo(
  matchDate: string,
  ticketSalesStart?: string | null
): boolean {
  // 過去試合は表示しない
  if (isPastMatch(matchDate)) {
    return false;
  }

  // チケット販売開始日が設定されていない場合は表示しない
  if (!ticketSalesStart) {
    return false;
  }

  return true;
}

/**
 * チケット販売状況を取得
 * @param matchDate - 試合日 (YYYY-MM-DD)
 * @param ticketSalesStart - チケット販売開始日 (YYYY-MM-DD | null)
 * @returns 販売状況のラベルと色
 */
export function getTicketSalesStatus(
  matchDate: string,
  ticketSalesStart?: string | null
): {
  label: string;
  color: string;
  bgColor: string;
  show: boolean;
} {
  // 過去試合または販売開始日が未設定の場合は非表示
  if (!shouldShowTicketInfo(matchDate, ticketSalesStart)) {
    return {
      label: '',
      color: '',
      bgColor: '',
      show: false,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const salesStart = new Date(ticketSalesStart!);
  salesStart.setHours(0, 0, 0, 0);

  // 販売開始前
  if (salesStart > today) {
    return {
      label: `販売開始: ${ticketSalesStart}`,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 border-orange-200',
      show: true,
    };
  }

  // 販売中
  return {
    label: 'チケット販売中',
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
    show: true,
  };
}

/**
 * 試合までの日数を取得
 * @param matchDate - 試合日 (YYYY-MM-DD)
 * @returns 日数 (負の値は過去)
 */
export function getDaysUntilMatch(matchDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const match = new Date(matchDate);
  match.setHours(0, 0, 0, 0);

  const diffTime = match.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * 試合までの日数を人間が読みやすい形式で取得
 * @param matchDate - 試合日 (YYYY-MM-DD)
 * @returns 「今日」「明日」「3日後」「2日前」など
 */
export function getMatchCountdown(matchDate: string): string {
  const days = getDaysUntilMatch(matchDate);

  if (days === 0) return '今日';
  if (days === 1) return '明日';
  if (days === 2) return '明後日';
  if (days > 0) return `${days}日後`;
  if (days === -1) return '昨日';
  if (days < 0) return `${Math.abs(days)}日前`;

  return '';
}

/**
 * J.LEAGUE チームのチケットページURL マッピング
 * Issue #124: AWAY試合のチケット情報リンク提供
 */
const TEAM_TICKET_URLS: Record<string, string> = {
  // J1 Teams
  '川崎フロンターレ': 'https://www.frontale.co.jp/ticket/',
  '浦和レッズ': 'https://www.urawa-reds.co.jp/ticket/',
  '鹿島アントラーズ': 'https://www.so-net.ne.jp/antlers/ticket/',
  'ガンバ大阪': 'https://www.gamba-osaka.net/ticket/',
  'セレッソ大阪': 'https://www.cerezo.jp/tickets/',
  '名古屋グランパス': 'https://nagoya-grampus.jp/ticket/',
  'サンフレッチェ広島': 'https://www.sanfrecce.co.jp/tickets/',
  'ヴィッセル神戸': 'https://www.vissel-kobe.co.jp/ticket/',
  'FC東京': 'https://www.fctokyo.co.jp/ticket',
  '柏レイソル': 'https://www.reysol.co.jp/ticket/',
  '横浜FC': 'https://www.yokohamafc.com/ticket/',
  'アルビレックス新潟': 'https://www.albirex.co.jp/ticket/',
  'サガン鳥栖': 'https://www.sagan-tosu.net/ticket/',
  '湘南ベルマーレ': 'https://www.bellmare.co.jp/ticket',
  '北海道コンサドーレ札幌': 'https://www.consadole-sapporo.jp/ticket/',
  'コンサドーレ札幌': 'https://www.consadole-sapporo.jp/ticket/',
  'アビスパ福岡': 'https://www.avispa.co.jp/ticket',
  '京都サンガF.C.': 'https://www.sanga-fc.jp/ticket/',
  '京都サンガ': 'https://www.sanga-fc.jp/ticket/',
  '町田ゼルビア': 'https://www.zelvia.co.jp/ticket/',
  // Add more teams as needed
};

/**
 * Issue #124: チケット購入URLを取得
 * @param marinosSide - マリノスのHOME/AWAY
 * @param opponent - 対戦相手
 * @returns チケット購入URL (見つからない場合はnull)
 */
export function getTicketUrl(
  marinosSide: 'home' | 'away' | null | undefined,
  opponent: string
): string | null {
  // HOME試合の場合はマリノス公式チケットページ
  if (marinosSide === 'home') {
    return 'https://www.f-marinos.com/ticket';
  }

  // AWAY試合の場合は対戦相手のチケットページ
  if (marinosSide === 'away') {
    // 正規化: 全角スペース・半角スペース・特殊文字を削除して比較
    const normalizedOpponent = opponent.trim();

    // 完全一致検索
    if (TEAM_TICKET_URLS[normalizedOpponent]) {
      return TEAM_TICKET_URLS[normalizedOpponent];
    }

    // 部分一致検索（チーム名が含まれる場合）
    for (const [teamName, url] of Object.entries(TEAM_TICKET_URLS)) {
      if (normalizedOpponent.includes(teamName) || teamName.includes(normalizedOpponent)) {
        return url;
      }
    }
  }

  return null;
}

/**
 * Issue #124: チケット情報未取得時のフォールバックメッセージを取得
 * @param marinosSide - マリノスのHOME/AWAY
 * @param opponent - 対戦相手
 * @returns フォールバックメッセージとリンク情報
 */
export function getTicketInfoFallback(
  marinosSide: 'home' | 'away' | null | undefined,
  opponent: string
): {
  message: string;
  linkText: string;
  linkUrl: string | null;
} {
  const ticketUrl = getTicketUrl(marinosSide, opponent);

  if (marinosSide === 'home') {
    return {
      message: 'チケット販売情報は未発表です',
      linkText: 'マリノス公式チケット情報',
      linkUrl: ticketUrl,
    };
  }

  // AWAY試合
  if (ticketUrl) {
    return {
      message: 'チケット販売情報は未発表です',
      linkText: `${opponent}のチケット情報`,
      linkUrl: ticketUrl,
    };
  }

  // URLが見つからない場合はJ.LEAGUE公式へ
  return {
    message: 'チケット販売情報は未発表です',
    linkText: 'J.LEAGUE公式サイト',
    linkUrl: 'https://www.jleague.jp/ticket/',
  };
}

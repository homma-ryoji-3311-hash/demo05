/**
 * ロギング共通設定。
 * ロガーは LoggingType（用途）で名前空間化する。
 */

/** ログ種別。用途ごとにロガーを分ける。 */
export type LoggingType = 'app' | 'access';

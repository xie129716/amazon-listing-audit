/** 项目根路径解析：默认取本文件所在目录的上一级，可用环境变量覆盖。 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

export const ROOT = process.env.LISTING_EXAM_ROOT
  || resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** lark-cli 可执行文件路径（飞书文档/表格读写），用环境变量 LARK_CLI 指定。 */
export const LARK_CLI = process.env.LARK_CLI || '<path/to/lark-cli>';

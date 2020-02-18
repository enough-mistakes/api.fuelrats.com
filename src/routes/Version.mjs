import fs from 'fs'
import { DocumentViewType } from '../Documents'
import ObjectDocument from '../Documents/ObjectDocument'
import { websocket } from '../classes/WebSocket'
import Query from '../query'
import { VersionView } from '../view'
import API, {
  GET,
} from './API'

const build = JSON.parse(fs.readFileSync('build.json', 'utf8'))

/**
 * API endpoint to get API version information
 */
export default class Version extends API {
  /**
   * @inheritdoc
   */
  get type () {
    return 'version'
  }

  /**
   * GET /version - Gets version information
   * @endpoint
   */
  @GET('/version')
  @websocket('version', 'read')
  read (ctx) {
    const {
      hash, branch, tags, date, version,
    } = build

    const result = {
      version,
      commit: hash,
      branch,
      tags,
      date,
    }

    const query = new Query({ connection: ctx })
    return new ObjectDocument({ query, result, type: VersionView, view: DocumentViewType.individual })
  }
}

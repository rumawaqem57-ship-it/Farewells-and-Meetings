export {};

declare global {
  interface Window {
    /** S0 挂载锚点：React 成功后置 true，给真机探针用。 */
    __koiBooted?: boolean;
  }
}

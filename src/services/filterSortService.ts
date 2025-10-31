/**
 * カスタムフィルター/ソート設定の管理サービス
 */

import { invoke } from '@tauri-apps/api/core';
import type { CustomFilter, CustomSort, CustomFiltersAndSorts } from '../types/task';

export class FilterSortService {
  /**
   * カスタムフィルター/ソート設定を取得
   */
  static async getFiltersAndSorts(workspacePath: string): Promise<CustomFiltersAndSorts> {
    return await invoke<CustomFiltersAndSorts>('get_filters_and_sorts', { workspacePath });
  }

  /**
   * カスタムフィルター/ソート設定を保存
   */
  static async saveFiltersAndSorts(
    workspacePath: string,
    filtersAndSorts: CustomFiltersAndSorts
  ): Promise<void> {
    await invoke('save_filters_and_sorts', { workspacePath, filtersAndSorts });
  }

  /**
   * カスタムフィルターを追加
   */
  static async addCustomFilter(
    workspacePath: string,
    filter: CustomFilter
  ): Promise<void> {
    const filtersAndSorts = await this.getFiltersAndSorts(workspacePath);
    filtersAndSorts.filters.push(filter);
    await this.saveFiltersAndSorts(workspacePath, filtersAndSorts);
  }

  /**
   * カスタムソートを追加
   */
  static async addCustomSort(
    workspacePath: string,
    sort: CustomSort
  ): Promise<void> {
    const filtersAndSorts = await this.getFiltersAndSorts(workspacePath);
    filtersAndSorts.sorts.push(sort);
    await this.saveFiltersAndSorts(workspacePath, filtersAndSorts);
  }

  /**
   * カスタムフィルターを削除
   */
  static async deleteCustomFilter(
    workspacePath: string,
    filterName: string
  ): Promise<void> {
    const filtersAndSorts = await this.getFiltersAndSorts(workspacePath);
    filtersAndSorts.filters = filtersAndSorts.filters.filter((f) => f.name !== filterName);
    await this.saveFiltersAndSorts(workspacePath, filtersAndSorts);
  }

  /**
   * カスタムソートを削除
   */
  static async deleteCustomSort(
    workspacePath: string,
    sortName: string
  ): Promise<void> {
    const filtersAndSorts = await this.getFiltersAndSorts(workspacePath);
    filtersAndSorts.sorts = filtersAndSorts.sorts.filter((s) => s.name !== sortName);
    await this.saveFiltersAndSorts(workspacePath, filtersAndSorts);
  }

  /**
   * カスタムフィルターを更新
   */
  static async updateCustomFilter(
    workspacePath: string,
    filterName: string,
    filter: CustomFilter
  ): Promise<void> {
    const filtersAndSorts = await this.getFiltersAndSorts(workspacePath);
    const index = filtersAndSorts.filters.findIndex((f) => f.name === filterName);
    if (index >= 0) {
      filtersAndSorts.filters[index] = filter;
    }
    await this.saveFiltersAndSorts(workspacePath, filtersAndSorts);
  }

  /**
   * カスタムソートを更新
   */
  static async updateCustomSort(
    workspacePath: string,
    sortName: string,
    sort: CustomSort
  ): Promise<void> {
    const filtersAndSorts = await this.getFiltersAndSorts(workspacePath);
    const index = filtersAndSorts.sorts.findIndex((s) => s.name === sortName);
    if (index >= 0) {
      filtersAndSorts.sorts[index] = sort;
    }
    await this.saveFiltersAndSorts(workspacePath, filtersAndSorts);
  }
}



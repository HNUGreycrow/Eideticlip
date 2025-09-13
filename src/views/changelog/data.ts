export interface ChangelogItem {
  version: string;
  date: string;
  categories: {
    name: string;
    items: string[];
  }[];
}

export const changelogData: ChangelogItem[] = [
  {
    version: "v1.1.3",
    date: "2025-09-14",
    categories: [
      {
        name: "修复",
        items: ["仅当前类型匹配时才将新记录添加到当前显示的记录列表"],
      },
      {
        name: "优化",
        items: [
          "窗口最大化/还原图标切换",
        ],
      },
    ],
  },
  {
    version: "v1.1.2",
    date: "2025-09-12",
    categories: [
      {
        name: "新功能",
        items: ["新增「设置 - 更新日志」界面，方便用户查看版本更新内容"],
      },
      {
        name: "优化",
        items: [
          "禁止应用多开",
          "优化设置界面的滚动部分",
          "部分样式优化",
        ],
      },
    ],
  },
];

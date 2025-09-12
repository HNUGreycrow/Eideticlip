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

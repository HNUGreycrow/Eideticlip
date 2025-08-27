export const checkShortcut = (shortcut: string) => {
  // 检查快捷键格式是否完整（必须包含修饰键和普通键）
  // 修饰键：Ctrl、Alt、Shift、Win（任选其一或两两组合）
  // 普通键：字母 A-Z、数字 0-9、F1-F12
  
  // 验证快捷键格式
  if (!shortcut || typeof shortcut !== 'string') {
    return {
      success: false,
      error: "请输入有效的快捷键组合",
    };
  }

  // 分割快捷键组合
  const keys = shortcut.split('+').map(key => key.trim());
  
  // 至少需要有两个键（一个修饰键和一个普通键）
  if (keys.length < 2) {
    return {
      success: false,
      error: "格式不正确！快捷键必须包含修饰键和普通键",
    };
  }

  // 检查修饰键
  const validModifiers = ["CommandOrControl","Ctrl", "Alt", "Shift", "Win"];
  const modifiers = keys.slice(0, -1); // 除了最后一个键，其他都应该是修饰键
  
  // 验证所有修饰键是否有效
  const allModifiersValid = modifiers.every(mod => validModifiers.includes(mod));
  if (!allModifiersValid) {
    return {
      success: false,
      error: "修饰键无效！请使用 Ctrl、Alt、Shift 或 Win",
    };
  }

  // 检查是否有重复的修饰键
  if (new Set(modifiers).size !== modifiers.length) {
    return {
      success: false,
      error: "修饰键不能重复使用",
    };
  }

  // 检查普通键（最后一个键）
  const normalKey = keys[keys.length - 1];
  
  // 普通键可以是字母A-Z、数字0-9、F1-F12或特殊符号
  const validNormalKey = /^([A-Za-z0-9]|F([1-9]|1[0-2])|`)$/.test(normalKey);
  if (!validNormalKey) {
    return {
      success: false,
      error: "普通键无效！请使用字母、数字、F1-F12",
    };
  }

  return {
    success: true,
  };
}

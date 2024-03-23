
document.addEventListener('DOMContentLoaded', function() {
  loadHostBindings();
});

function loadHostBindings() {
    chrome.storage.local.get(['hostBindings'], function(result) {
        const hostBindings = result.hostBindings || [];
        const listElement = document.getElementById('boundHostList');
        listElement.innerHTML = ''; // 清空现有列表
        hostBindings.forEach((binding, index) => {
            const li = document.createElement('li');

            // 添加是否使用的复选框
            const useCheckbox = document.createElement('input');
            useCheckbox.type = 'checkbox';
            useCheckbox.checked = binding.use; // 根据存储的值设置复选框的状态
            useCheckbox.onchange = function() { toggleHostUse(index, useCheckbox.checked); };
            li.appendChild(useCheckbox);

            // 添加Host和代理源的文本
            const text = document.createTextNode(` ${binding.host} -> ${binding.selectedProxy}`);
            li.appendChild(text);

            listElement.appendChild(li);
        });
    });
}

function toggleHostUse(index, use) {
    chrome.storage.local.get(['hostBindings'], function(result) {
        let hostBindings = result.hostBindings || [];
        if (index >= 0 && index < hostBindings.length) {
            hostBindings[index].use = use; // 更新使用状态
            chrome.storage.local.set({hostBindings}, function() {
                console.log('Host使用状态已更新。');
            });
        }
    });
}

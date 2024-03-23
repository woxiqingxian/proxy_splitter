document.addEventListener('DOMContentLoaded', function() {
     loadInfo();
});


function getStorage(keys) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(keys, (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(result);
            }
        });
    });
}

function setStorage(items) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set(items, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}


function loadInfo() {
    loadProxySources(); // 假设你已经有这个函数加载代理源列表
    loadHostBindingsProxyOption(); // 加载Host绑定的代理源选项
    loadHostBindings(); // 假设你已经有这个函数加载Host绑定
    loadDefaultProxyOption(); // 加载默认代理选项
}

// 清除存储记录
document.getElementById('clearStorage').addEventListener('click', function() {
    if (confirm('确定要清除所有存储记录吗？此操作不可撤销！')) {
        chrome.storage.local.clear(function() {
            const error = chrome.runtime.lastError;
            if (!error) {
                console.log('所有存储记录已清除。');
            } else {
                console.error('清除存储记录时发生错误:', error);
            }
            loadInfo();
        });
    }
});

// 添加代理源
document.getElementById('addProxySource').addEventListener('click', async function() {
    const proxyName = document.getElementById('proxyName').value.trim();
    const proxyIP = document.getElementById('proxyIP').value.trim();
    const proxyPort = document.getElementById('proxyPort').value.trim();

    if (!proxyName || !proxyIP || !proxyPort) {
        alert('所有字段都是必填的！');
        return;
    }

    try {
        // 获取现有的代理源配置
        const result = await getStorage(['proxySources']);
        const proxySources = result.proxySources || [];
        
        // 检查代理名称是否已存在
        if (proxySources.some(p => p.proxyName === proxyName)) {
            alert('代理名称已存在。');
            return;
        }

        // 添加新的代理源并保存
        proxySources.push({ proxyName, proxyIP, proxyPort });
        await setStorage({proxySources});
        console.log('代理源设置已保存。');
        document.getElementById('proxySourceForm').reset();

    } catch (error) {
        console.error('添加代理源过程中出错：', error);
        alert('保存代理源时出错，请检查控制台日志了解详情。');
    }

    loadInfo(); // 假设这是更新UI的函数
});

// 绑定Host到代理源
document.getElementById('bindHost').addEventListener('click', async function() {
    const host = document.getElementById('host').value.trim();
    const selectedProxy = document.getElementById('selectedProxy').value.trim();
    const use = true; // 标记是否使用代理

    if (!host || !selectedProxy) {
        alert('所有字段都是必填的！');
        return;
    }

    try {
        // 获取现有绑定配置
        const result = await getStorage(['hostBindings']);
        const hostBindings = result.hostBindings || [];
        hostBindings.push({ host, selectedProxy, use });

        // 保存新的绑定配置
        await setStorage({ hostBindings });
        console.log('Host 绑定已保存。');
        document.getElementById('hostBindingForm').reset();
    } catch (error) {
        console.error('绑定过程中出错：', error);
        alert('保存绑定时出错，请检查控制台日志了解详情。');
    }

    loadInfo(); 
});



// 保存默认代理
document.getElementById('saveDefaultProxy').addEventListener('click', async function() {
    const selectedDefaultProxy = document.getElementById('defaultProxy').value;

    try {
        await setStorage({defaultProxyName: selectedDefaultProxy});
        console.log('默认代理已保存。');
        
        // 显示保存成功的消息，并在一段时间后清除该消息
        const defaultProxyMessageElement = document.getElementById('defaultProxyMessage');
        defaultProxyMessageElement.textContent = '默认代理保存成功！';
        setTimeout(() => defaultProxyMessageElement.textContent = '', 1300);
    } catch (error) {
        console.error('保存默认代理时出错：', error);
        // 可以考虑在UI上显示错误消息
        const defaultProxyMessageElement = document.getElementById('defaultProxyMessage');
        defaultProxyMessageElement.textContent = '保存默认代理出错，请检查控制台日志了解详情。';
        setTimeout(() => defaultProxyMessageElement.textContent = '', 2000); // 增加显示错误消息的时间，给用户更多阅读时间
    }
});



async function loadProxySources() {
    try {
        const result = await getStorage(['proxySources']);
        const proxySources = result.proxySources || [];
        const proxySourceListElement = document.getElementById('proxySourceList');

        proxySourceListElement.innerHTML = ''; // 清空现有列表

        proxySources.forEach((source, index) => {
            // 显示代理源列表
            const li = document.createElement('li');
            li.textContent = `${source.proxyName}: ${source.proxyIP}:${source.proxyPort}`;
            // 添加删除按钮
            const deleteButton = document.createElement('button');
            deleteButton.textContent = '删除';
            deleteButton.onclick = function() { deleteProxySource(index); };
            li.appendChild(deleteButton);
            proxySourceListElement.appendChild(li);
        });
    } catch (error) {
        console.error('加载代理源时出错：', error);
    }
}



async function deleteProxySource(index) {
    try {
        const result = await getStorage(['proxySources', 'hostBindings', 'defaultProxyName']);
        const proxySources = result.proxySources || [];
        const hostBindings = result.hostBindings || [];
        const defaultProxyName = result.defaultProxyName || '';

        if (index >= 0 && index < proxySources.length) {
            const proxyNameToDelete = proxySources[index].proxyName;
            const hostsBoundToProxy = hostBindings.filter(binding => binding.selectedProxy === proxyNameToDelete);

            if (hostsBoundToProxy.length > 0) {
                const userChoice = confirm(`发现${hostsBoundToProxy.length}个host绑定到这个代理源。\n删除代理源同时也删除这些host绑定？\n选择“确定”删除host绑定，选择“取消”不做处理。`);
                if (!userChoice) {
                    console.log('操作取消或需要额外逻辑处理。');
                    return;
                }
            }

            const updatedHostBindings = hostBindings.filter(binding => binding.selectedProxy !== proxyNameToDelete);

            await setStorage({ hostBindings: updatedHostBindings });
            console.log('相关的host绑定已删除。');

            if (defaultProxyName === proxyNameToDelete) {
                await setStorage({ defaultProxyName: '' });
                console.log('默认代理已删除。');
            }

            proxySources.splice(index, 1);
            await setStorage({proxySources});
            console.log('代理源已删除。');
        }
    } catch (error) {
        console.error('deleteProxySource 操作失败:', error);
    }
    loadInfo(); 
}



async function loadHostBindingsProxyOption() {
    try {
        const result = await getStorage(['proxySources']);
        const proxySources = result.proxySources || [];

        const selectedProxyElement = document.getElementById('selectedProxy');
        selectedProxyElement.innerHTML = '<option value="DIRECT">直连</option>'; // 添加直连选项

        proxySources.forEach(source => {
            const option = document.createElement('option');
            option.value = source.proxyName;
            option.text = source.proxyName;
            selectedProxyElement.appendChild(option);
        });
    } catch (error) {
        console.error('加载代理源选项时出错：', error);
    }
}

async function loadHostBindings() {
    try {
        const result = await getStorage(['hostBindings']);
        const hostBindings = result.hostBindings || [];
        const listElement = document.getElementById('boundHostList');
        listElement.innerHTML = ''; // 清空现有列表

        hostBindings.forEach((binding, index) => {
            const li = document.createElement('li');

            // 添加是否使用的复选框
            const useCheckbox = document.createElement('input');
            useCheckbox.type = 'checkbox';
            useCheckbox.checked = binding.use;
            useCheckbox.onchange = function() { toggleHostUse(index, useCheckbox.checked); };
            li.appendChild(useCheckbox);

            // 添加Host和代理源的文本
            const text = document.createTextNode(` ${binding.host} -> ${binding.selectedProxy}`);
            li.appendChild(text);

            // 添加删除按钮
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '删除';
            deleteBtn.onclick = function() { deleteHostBinding(index); };
            li.appendChild(deleteBtn);

            listElement.appendChild(li);
        });
    } catch (error) {
        console.error('加载Host绑定时出错：', error);
    }
}

async function deleteHostBinding(index) {
    try {
        const result = await getStorage(['hostBindings']);
        let hostBindings = result.hostBindings || [];
        if (index >= 0 && index < hostBindings.length) {
            hostBindings.splice(index, 1); // 删除指定索引的绑定
            await setStorage({hostBindings});
            console.log('Host绑定已删除。');
        }
    } catch (error) {
        console.error('删除Host绑定时出错：', error);
    }
    loadInfo(); 
}

async function toggleHostUse(index, use) {
    try {
        const result = await getStorage(['hostBindings']);
        let hostBindings = result.hostBindings || [];
        if (index >= 0 && index < hostBindings.length) {
            hostBindings[index].use = use; // 更新使用状态
            await setStorage({hostBindings});
            console.log('Host使用状态已更新。');
        }
    } catch (error) {
        console.error('更新Host使用状态时出错：', error);
    }
}

async function loadDefaultProxyOption() {
    try {
        const result = await getStorage(['proxySources', 'defaultProxyName']);
        const proxySources = result.proxySources || [];
        const defaultProxyName = result.defaultProxyName || '';
        const defaultProxySelect = document.getElementById('defaultProxy');
        defaultProxySelect.innerHTML = '<option value="">直连</option>'; // 添加直连选项
        proxySources.forEach(source => {
            const option = document.createElement('option');
            option.value = source.proxyName;
            option.text = source.proxyName;
            option.selected = (source.proxyName === defaultProxyName);
            defaultProxySelect.appendChild(option);
        });
    } catch (error) {
        console.error('加载默认代理选项时出错：', error);
    }
}

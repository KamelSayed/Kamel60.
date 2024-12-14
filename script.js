// حالة التطبيق
let state = {
    inventory: [],
    boxes: [],
    activities: [],
    view: 'grid',
    activeSection: 'inventory',
    missingItems: []
};

// تحميل البيانات
function loadData() {
    const savedState = localStorage.getItem('equipmentSystem');
    if (savedState) {
        state = JSON.parse(savedState);
        renderAll();
    }
}

// حفظ البيانات
function saveData() {
    localStorage.setItem('equipmentSystem', JSON.stringify(state));
}

// تحميل البيانات كملف JSON
function downloadData() {
    const data = {
        inventory: state.inventory,
        boxes: state.boxes,
        missingItems: state.missingItems,
        activities: state.activities
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const today = new Date().toISOString().split('T')[0];
    const filename = `equipment_management_${today}.json`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('تم تحميل البيانات بنجاح');
}

// رفع البيانات من ملف JSON
function uploadData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // التحقق من صحة البيانات
            if (!validateData(data)) {
                showNotification('الملف غير صالح. يجب أن يحتوي على جميع البيانات المطلوبة', 'error');
                return;
            }
            
            // حفظ البيانات القديمة للاسترجاع في حالة حدوث خطأ
            const oldState = { ...state };
            
            try {
                // تحديث البيانات
                state.inventory = data.inventory;
                state.boxes = data.boxes;
                state.missingItems = data.missingItems;
                state.activities = data.activities;
                
                // إضافة نشاط استيراد البيانات
                addActivity(
                    'تم استيراد البيانات من ملف',
                    'system',
                    {
                        action: 'import',
                        filename: file.name
                    }
                );
                
                // تحديث العرض وحفظ البيانات
                renderAll();
                saveData();
                showNotification('تم رفع البيانات بنجاح');
                
            } catch (error) {
                // استرجاع البيانات القديمة في حالة حدوث خطأ
                state = oldState;
                showNotification('حدث خطأ أثناء تحديث البيانات', 'error');
                console.error('Error updating data:', error);
            }
            
        } catch (error) {
            showNotification('فشل في قراءة الملف. تأكد من أن الملف بتنسيق JSON صحيح', 'error');
            console.error('Error parsing JSON:', error);
        }
    };
    
    reader.readAsText(file);
    // إعادة تعيين حقل الملف للسماح برفع نفس الملف مرة أخرى
    event.target.value = '';
}

// التحقق من صحة البيانات المستوردة
function validateData(data) {
    // التحقق من وجود جميع الأقسام المطلوبة
    if (!data.inventory || !Array.isArray(data.inventory)) return false;
    if (!data.boxes || !Array.isArray(data.boxes)) return false;
    if (!data.missingItems || !Array.isArray(data.missingItems)) return false;
    if (!data.activities || !Array.isArray(data.activities)) return false;
    
    // التحقق من صحة بيانات المخزون
    for (const item of data.inventory) {
        if (!item.id || !item.name || typeof item.quantity !== 'number') {
            return false;
        }
    }
    
    // التحقق من صحة بيانات الصناديق
    for (const box of data.boxes) {
        if (!box.id || !Array.isArray(box.items)) {
            return false;
        }
    }
    
    return true;
}

// إضافة نشاط جديد
function addActivity(text, category, details = {}) {
    const activity = {
        id: Date.now(),
        text,
        category,
        date: new Date().toISOString(),
        details
    };

    state.activities.unshift(activity);
    if (state.activities.length > 1000) {
        state.activities.pop();
    }
    
    saveData();
    renderActivities();
}

// عرض إشعار
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.getElementById('notifications').appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// تبديل العرض
function toggleView(view) {
    state.view = view;
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.trim().toLowerCase() === view);
    });
    renderInventory();
    renderBoxes();
}

// تبديل القسم النشط
function showSection(sectionId) {
    state.activeSection = sectionId;
    document.querySelectorAll('.section').forEach(section => {
        section.classList.toggle('active', section.id === sectionId);
    });
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.trim().toLowerCase().includes(sectionId));
    });
}

// إظهار النافذة المنبثقة
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

// إغلاق النافذة المنبثقة
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// تعديل الكمية
function adjustQuantity(inputId, amount) {
    const input = document.getElementById(inputId);
    const newValue = Math.max(1, parseInt(input.value) + amount);
    input.value = newValue;
}

// إضافة معدة جديدة
function handleAddItem(event) {
    event.preventDefault();
    const form = event.target;
    const name = form.name.value;
    const quantity = parseInt(form.quantity.value);

    const existingItem = state.inventory.find(item => item.name === name);
    if (existingItem) {
        existingItem.quantity += quantity;
        showNotification('تم تحديث كمية المعدة بنجاح');
    } else {
        state.inventory.push({
            id: Date.now(),
            name,
            quantity,
            used: 0
        });
        showNotification('تمت إضافة المعدة بنجاح');
    }

    addActivity(`تمت إضافة ${quantity} ${name} إلى المخزون`);
    closeModal('addItemModal');
    form.reset();
    renderInventory();
    saveData();
}

// إضافة معدة للصندوق
function addBoxItem() {
    const boxItems = document.getElementById('boxItems');
    const itemDiv = document.createElement('div');
    itemDiv.className = 'form-group';
    itemDiv.innerHTML = `
        <div style="display: flex; gap: 1rem; align-items: flex-end">
            <div style="flex: 1">
                <label>المعدة</label>
                <select required>
                    <option value="">اختر معدة</option>
                    ${state.inventory.map(item => `
                        <option value="${item.id}">${item.name} (متاح: ${item.quantity - item.used})</option>
                    `).join('')}
                </select>
            </div>
            <div>
                <label>الكمية</label>
                <input type="number" min="1" value="1" required>
            </div>
            <button type="button" class="btn" onclick="this.parentElement.parentElement.remove()">حذف</button>
        </div>
    `;
    boxItems.appendChild(itemDiv);
}

// إنشاء صندوق جديد
function handleCreateBox(event) {
    event.preventDefault();
    const form = event.target;
    const name = form.name.value;
    const receiver = form.receiver.value;
    const location = form.location.value;

    const itemElements = form.querySelectorAll('#boxItems .form-group');
    const items = Array.from(itemElements).map(element => {
        const select = element.querySelector('select');
        const input = element.querySelector('input[type="number"]');
        const item = state.inventory.find(i => i.id === parseInt(select.value));
        return {
            id: item.id,
            name: item.name,
            quantity: parseInt(input.value)
        };
    });

    // التحقق من توفر الكميات
    for (const item of items) {
        const inventoryItem = state.inventory.find(i => i.id === item.id);
        if (inventoryItem.quantity - inventoryItem.used < item.quantity) {
            showNotification(`الكمية المطلوبة من ${item.name} غير متوفرة`, 'error');
            return;
        }
    }

    // تحديث المخزون
    for (const item of items) {
        const inventoryItem = state.inventory.find(i => i.id === item.id);
        inventoryItem.used += item.quantity;
    }

    // إنشاء الصندوق
    const box = {
        id: Date.now(),
        name,
        receiver,
        location,
        items,
        status: 'active',
        createdAt: new Date().toISOString(),
        returnedAt: null
    };

    state.boxes.push(box);
    addActivity(`تم إنشاء صندوق جديد: ${name}`);
    showNotification('تم إنشاء الصندوق بنجاح');
    closeModal('createBoxModal');
    form.reset();
    document.getElementById('boxItems').innerHTML = '';
    renderAll();
    saveData();
}

// إرجاع صندوق
function returnBox(boxId) {
    const box = state.boxes.find(b => b.id === boxId);
    if (!box || box.status !== 'active') return;

    // تحديث المخزون
    for (const item of box.items) {
        const inventoryItem = state.inventory.find(i => i.id === item.id);
        inventoryItem.used -= item.quantity;
    }

    box.status = 'expired'; // تغيير الحالة إلى منتهي الصلاحية
    box.returnedAt = new Date().toISOString();

    showNotification('تم إرجاع الصندوق بنجاح');
    addActivity(`تم إرجاع صندوق: ${box.name}`);
    renderAll();
    saveData();
}

// تعديل المخزون
function adjustEditQuantity(change) {
    const input = document.getElementById('editInventoryQuantity');
    const newValue = parseInt(input.value) + change;
    if (newValue >= 1) {
        input.value = newValue;
    }
}

function editInventoryItem(itemId) {
    const item = state.inventory.find(i => i.id === itemId);
    if (!item) return;

    document.getElementById('editInventoryId').value = item.id;
    document.getElementById('editInventoryQuantity').value = 1;
    document.getElementById('editInventoryType').value = 'add';
    
    showModal('editInventoryModal');
}

function handleEditInventory(event) {
    event.preventDefault();
    const form = event.target;
    const id = parseInt(form.id.value);
    const changeAmount = parseInt(form.quantity.value);
    const editType = form.editType.value;

    const item = state.inventory.find(i => i.id === id);
    if (!item) return;

    if (editType === 'add') {
        item.quantity += changeAmount;
        showNotification(`تمت إضافة ${changeAmount} إلى ${item.name}`);
        addActivity(`تمت إضافة ${changeAmount} إلى ${item.name}`);
    } else {
        // التحقق من إمكانية الخصم
        const availableQuantity = item.quantity - item.used;
        if (changeAmount > availableQuantity) {
            showNotification(`لا يمكن خصم ${changeAmount} من ${item.name}. الكمية المتاحة: ${availableQuantity}`, 'error');
            return;
        }
        item.quantity -= changeAmount;
        showNotification(`تم خصم ${changeAmount} من ${item.name}`);
        addActivity(`تم خصم ${changeAmount} من ${item.name}`);
    }

    closeModal('editInventoryModal');
    renderInventory();
    saveData();
}

// حذف معدة
function deleteInventoryItem(itemId) {
    const item = state.inventory.find(i => i.id === itemId);
    if (!item) return;

    // التحقق من عدم استخدام المعدة في أي صندوق نشط
    if (item.used > 0) {
        showNotification('لا يمكن حذف المعدة لأنها مستخدمة في صناديق نشطة', 'error');
        return;
    }

    if (confirm(`هل أنت متأكد من حذف ${item.name}؟`)) {
        state.inventory = state.inventory.filter(i => i.id !== itemId);
        showNotification('تم حذف المعدة بنجاح');
        addActivity(`تم حذف معدة: ${item.name}`);
        renderInventory();
        saveData();
    }
}

// عرض قسم معين
function showSection(sectionId) {
    const sections = ['inventory', 'boxes', 'expiredBoxes', 'activities'];
    sections.forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            section.style.display = id === sectionId ? 'block' : 'none';
        }
    });
}

// البحث في الصناديق منتهية الصلاحية
function handleExpiredSearch() {
    const query = document.getElementById('searchExpiredBoxes').value.toLowerCase();
    renderExpiredBoxes(query);
}

// عرض الصناديق النشطة
function renderBoxes(search = '') {
    let boxes = state.boxes.filter(box => box.status === 'active');

    // البحث
    if (search) {
        boxes = boxes.filter(box => 
            (box.name && box.name.toLowerCase().includes(search)) ||
            (box.receiver && box.receiver.toLowerCase().includes(search)) ||
            (box.location && box.location.toLowerCase().includes(search)) ||
            box.items.some(item => item.name.toLowerCase().includes(search))
        );
    }

    const grid = document.getElementById('boxesGrid');
    grid.innerHTML = boxes.map(box => `
        <div class="box-card">
            <div class="box-header">
                <h3 class="box-title">${box.name || box.receiver}</h3>
                <span class="box-status">نشط</span>
            </div>
            <div class="box-info">
                ${box.receiver ? `<div>المستلم: ${box.receiver}</div>` : ''}
                ${box.location ? `<div>الموقع: ${box.location}</div>` : ''}
                <div>تاريخ الإنشاء: ${formatDate(box.createdAt)}</div>
            </div>
            <div class="box-items">
                ${box.items.map(item => `
                    <div class="box-item">
                        <span>${item.name}</span>
                        <span>${item.quantity}</span>
                    </div>
                `).join('')}
            </div>
            <div class="form-actions">
                <button onclick="editBox(${box.id})" class="btn">تعديل</button>
                <button onclick="returnBox(${box.id})" class="btn">إرجاع</button>
                <button onclick="deleteBox(${box.id})" class="btn danger">حذف</button>
                <button onclick="printBox(${box.id})" class="btn">طباعة</button>
                <button onclick="exportBoxToExcel(${box.id})" class="btn">تصدير إلى Excel</button>
            </div>
        </div>
    `).join('');
}

// عرض الصناديق منتهية الصلاحية
function renderExpiredBoxes(search = '') {
    let boxes = state.boxes.filter(box => box.status === 'expired');

    // البحث
    if (search) {
        boxes = boxes.filter(box => 
            (box.name && box.name.toLowerCase().includes(search)) ||
            (box.receiver && box.receiver.toLowerCase().includes(search)) ||
            (box.location && box.location.toLowerCase().includes(search)) ||
            box.items.some(item => item.name.toLowerCase().includes(search))
        );
    }

    // ترتيب حسب تاريخ الإرجاع (الأحدث أولاً)
    boxes.sort((a, b) => new Date(b.returnedAt) - new Date(a.returnedAt));

    const grid = document.getElementById('expiredBoxesGrid');
    grid.innerHTML = boxes.map(box => `
        <div class="box-card expired">
            <div class="box-header">
                <h3 class="box-title">${box.name || box.receiver}</h3>
                <span class="box-status expired">منتهي الصلاحية</span>
            </div>
            <div class="box-info">
                ${box.receiver ? `<div>المستلم: ${box.receiver}</div>` : ''}
                ${box.location ? `<div>الموقع: ${box.location}</div>` : ''}
                <div>تاريخ الإنشاء: ${formatDate(box.createdAt)}</div>
                <div>تاريخ الإرجاع: ${formatDate(box.returnedAt)}</div>
            </div>
            <div class="box-items">
                ${box.items.map(item => `
                    <div class="box-item">
                        <span>${item.name}</span>
                        <span>${item.quantity}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// عرض المخزون
function renderInventory(search = '', sort = 'name') {
    let items = [...state.inventory];

    // البحث
    if (search) {
        items = items.filter(item => 
            item.name.toLowerCase().includes(search)
        );
    }

    // الترتيب
    items.sort((a, b) => {
        switch (sort) {
            case 'name':
                return a.name.localeCompare(b.name);
            case 'quantity':
                return b.quantity - a.quantity;
            case 'usage':
                return (b.used / b.quantity) - (a.used / a.quantity);
            default:
                return 0;
        }
    });

    const grid = document.getElementById('inventoryGrid');
    grid.innerHTML = items.map(item => `
        <div class="inventory-card">
            <div class="inventory-header">
                <h3 class="inventory-title">${item.name}</h3>
                <span class="inventory-quantity">${item.used}/${item.quantity}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${(item.used / item.quantity * 100)}%"></div>
            </div>
            <div class="form-actions" style="margin-top: 1rem;">
                <button onclick="editInventoryItem(${item.id})" class="btn">تعديل</button>
                <button onclick="deleteInventoryItem(${item.id})" class="btn danger">حذف</button>
            </div>
        </div>
    `).join('');
}

// عرض النشاطات
function renderActivities() {
    const list = document.getElementById('activitiesList');
    const search = document.getElementById('activitySearch').value.toLowerCase();
    const filter = document.getElementById('activityFilter').value;

    let activities = state.activities;

    // تطبيق التصفية
    if (filter) {
        activities = activities.filter(activity => activity.category === filter);
    }

    // تطبيق البحث
    if (search) {
        activities = activities.filter(activity => 
            activity.text.toLowerCase().includes(search)
        );
    }

    list.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-text">${activity.text}</div>
            <div class="activity-meta">
                <span class="activity-date">${formatDate(activity.date)}</span>
                ${activity.category ? `<span class="activity-category ${activity.category}">${getCategoryName(activity.category)}</span>` : ''}
            </div>
        </div>
    `).join('');
}

// الحصول على اسم التصنيف
function getCategoryName(category) {
    const categories = {
        'box': 'صندوق',
        'inventory': 'مخزون',
        'missing': 'نواقص'
    };
    return categories[category] || category;
}

// تتبع نواقص المعدات
function trackMissingItems() {
    const missingItems = [];
    
    // فحص كل صندوق نشط
    state.boxes.forEach(box => {
        if (box.status === 'active' && box.missingItems) {
            box.missingItems.forEach(item => {
                missingItems.push({
                    itemId: item.id,
                    itemName: item.name,
                    quantity: item.quantity,
                    boxId: box.id,
                    boxName: box.name || box.receiver,
                    reportDate: item.reportDate
                });
            });
        }
    });

    return missingItems;
}

// عرض نواقص المعدات
function renderMissingItems() {
    const grid = document.getElementById('missingItemsGrid');
    const missingItems = trackMissingItems();

    if (missingItems.length === 0) {
        grid.innerHTML = '<div class="empty-state">لا توجد نواقص معدات مسجلة</div>';
        return;
    }

    grid.innerHTML = missingItems.map(item => `
        <div class="missing-item-card">
            <div class="missing-item-header">
                <h3>${item.itemName}</h3>
                <span>الكمية المفقودة: ${item.quantity}</span>
            </div>
            <div class="missing-item-info">
                <div class="missing-item-box">
                    <div>الصندوق: ${item.boxName}</div>
                    <div>تاريخ التسجيل: ${formatDate(item.reportDate)}</div>
                </div>
            </div>
            <div class="form-actions">
                <button onclick="resolveMissingItem(${item.boxId}, ${item.itemId})" class="btn">
                    تم الحل
                </button>
            </div>
        </div>
    `).join('');
}

// تسجيل معدة مفقودة
function reportMissingItem(boxId, itemId, quantity) {
    const box = state.boxes.find(b => b.id === boxId);
    if (!box) return;

    if (!box.missingItems) {
        box.missingItems = [];
    }

    const missingItem = {
        id: itemId,
        name: state.inventory.find(i => i.id === itemId).name,
        quantity: quantity,
        reportDate: new Date().toISOString()
    };

    box.missingItems.push(missingItem);
    
    // تحديث المخزون
    const inventoryItem = state.inventory.find(i => i.id === itemId);
    if (inventoryItem) {
        inventoryItem.used -= quantity;
    }

    addActivity(`تم تسجيل نقص ${missingItem.name} (${quantity}) من صندوق ${box.name || box.receiver}`, 'missing');
    renderAll();
    saveData();
}

// حل مشكلة معدة مفقودة
function resolveMissingItem(boxId, itemId) {
    const box = state.boxes.find(b => b.id === boxId);
    if (!box || !box.missingItems) return;

    const missingItemIndex = box.missingItems.findIndex(item => item.id === itemId);
    if (missingItemIndex === -1) return;

    const missingItem = box.missingItems[missingItemIndex];
    box.missingItems.splice(missingItemIndex, 1);

    addActivity(`تم حل مشكلة نقص ${missingItem.name} من صندوق ${box.name || box.receiver}`, 'missing');
    renderAll();
    saveData();
}

// عرض نموذج إضافة نواقص
function showAddMissing(boxId) {
    const box = state.boxes.find(b => b.id === boxId);
    if (!box) return;

    document.getElementById('missingBoxId').value = boxId;
    const select = document.getElementById('missingItemSelect');
    select.innerHTML = '<option value="">اختر المعدة</option>';
    
    // إضافة المعدات الموجودة في الصندوق فقط
    box.items.forEach(item => {
        select.innerHTML += `
            <option value="${item.id}">${item.name} (الكمية الحالية: ${item.quantity})</option>
        `;
    });

    showModal('addMissingModal');
}

// معالجة إضافة نواقص
function handleAddMissing(event) {
    event.preventDefault();
    const form = event.target;
    const boxId = parseInt(form.boxId.value);
    const itemId = parseInt(form.itemId.value);
    const quantity = parseInt(form.quantity.value);
    const notes = form.notes.value;

    const box = state.boxes.find(b => b.id === boxId);
    const boxItem = box.items.find(item => item.id === itemId);

    if (!box || !boxItem) return;

    // التحقق من الكمية
    if (quantity > boxItem.quantity) {
        showNotification('الكمية المفقودة لا يمكن أن تكون أكبر من الكمية الموجودة', 'error');
        return;
    }

    // إضافة النواقص
    if (!box.missingItems) {
        box.missingItems = [];
    }

    const missingItem = {
        id: itemId,
        name: boxItem.name,
        quantity: quantity,
        notes: notes,
        reportDate: new Date().toISOString()
    };

    box.missingItems.push(missingItem);
    
    // تحديث كمية المعدة في الصندوق
    boxItem.quantity -= quantity;

    // تحديث المخزون
    const inventoryItem = state.inventory.find(i => i.id === itemId);
    if (inventoryItem) {
        inventoryItem.used -= quantity;
    }

    addActivity(`تم تسجيل نقص ${missingItem.name} (${quantity}) من صندوق ${box.name || box.receiver}${notes ? ` - ${notes}` : ''}`, 'missing');
    showNotification('تم تسجيل النواقص بنجاح');
    closeModal('addMissingModal');
    renderAll();
    saveData();
}

// طباعة الصندوق
function printBox(boxId) {
    const box = state.boxes.find(b => b.id === boxId);
    if (!box) return;

    // إنشاء نافذة الطباعة
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
        <html dir="rtl">
        <head>
            <title>طباعة الصندوق - ${box.name || box.receiver}</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
                
                body {
                    font-family: 'Cairo', sans-serif;
                    padding: 20px;
                    direction: rtl;
                    background-color: #f5f5f5;
                    margin: 0;
                }

                .print-container {
                    background-color: white;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                    border-radius: 8px;
                }

                .box-header {
                    text-align: center;
                    margin-bottom: 20px;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #333;
                }

                .box-header h1 {
                    color: #1976d2;
                    margin: 0;
                }

                .box-info {
                    background-color: #f8f9fa;
                    padding: 15px;
                    border-radius: 4px;
                    margin: 20px 0;
                }

                .box-info div {
                    margin: 8px 0;
                    display: flex;
                    justify-content: space-between;
                }

                .box-info strong {
                    color: #333;
                }

                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                }

                .items-table th {
                    background-color: #1976d2;
                    color: white;
                    padding: 12px;
                    text-align: right;
                }

                .items-table td {
                    padding: 10px;
                    border: 1px solid #ddd;
                }

                .items-table tr:nth-child(even) {
                    background-color: #f8f9fa;
                }

                .missing-items {
                    margin-top: 30px;
                    border: 1px solid #ffcdd2;
                    border-radius: 4px;
                    padding: 15px;
                    background-color: #fff5f5;
                }

                .missing-items h3 {
                    color: #d32f2f;
                    margin-top: 0;
                }

                .footer {
                    margin-top: 30px;
                    text-align: center;
                    color: #666;
                    font-size: 0.9em;
                    border-top: 1px solid #ddd;
                    padding-top: 20px;
                }

                @media print {
                    body {
                        background-color: white;
                    }
                    .print-container {
                        box-shadow: none;
                    }
                    .no-print {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            <div class="print-container">
                <div class="box-header">
                    <h1>تفاصيل الصندوق</h1>
                    <h2>${box.name || box.receiver}</h2>
                </div>
                <div class="box-info">
                    ${box.name ? `<div><strong>الاسم:</strong> ${box.name}</div>` : ''}
                    ${box.receiver ? `<div><strong>المستلم:</strong> ${box.receiver}</div>` : ''}
                    ${box.location ? `<div><strong>الموقع:</strong> ${box.location}</div>` : ''}
                    <div><strong>تاريخ الإنشاء:</strong> ${formatDate(box.createdAt)}</div>
                    <div><strong>الحالة:</strong> ${box.status === 'active' ? 'نشط' : 'منتهي الصلاحية'}</div>
                </div>
                
                <h3><i class="fas fa-box"></i> محتويات الصندوق</h3>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>المعدة</th>
                            <th>الكمية</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${box.items.map((item, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${item.name}</td>
                                <td>${item.quantity}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                ${box.missingItems && box.missingItems.length > 0 ? `
                    <div class="missing-items">
                        <h3><i class="fas fa-exclamation-triangle"></i> المعدات المفقودة</h3>
                        <table class="items-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>المعدة</th>
                                    <th>الكمية المفقودة</th>
                                    <th>تاريخ التسجيل</th>
                                    <th>ملاحظات</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${box.missingItems.map((item, index) => `
                                    <tr>
                                        <td>${index + 1}</td>
                                        <td>${item.name}</td>
                                        <td>${item.quantity}</td>
                                        <td>${formatDate(item.reportDate)}</td>
                                        <td>${item.notes || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}

                <div class="footer">
                    <p>تم الطباعة في: ${formatDate(new Date().toISOString())}</p>
                    <p>نظام إدارة المعدات</p>
                </div>
            </div>
            <div class="no-print" style="text-align: center; margin-top: 20px;">
                <button onclick="window.print()" style="
                    padding: 10px 20px;
                    background-color: #1976d2;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-family: 'Cairo', sans-serif;
                ">
                    <i class="fas fa-print"></i> طباعة
                </button>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// تصدير الصندوق إلى Excel
function exportBoxToExcel(boxId) {
    const box = state.boxes.find(b => b.id === boxId);
    if (!box) return;

    // إنشاء مصفوفة البيانات
    const data = [
        ['معلومات الصندوق'],
        ['الاسم', box.name || ''],
        ['المستلم', box.receiver || ''],
        ['الموقع', box.location || ''],
        ['تاريخ الإنشاء', formatDate(box.createdAt)],
        ['الحالة', box.status === 'active' ? 'نشط' : 'منتهي الصلاحية'],
        [],
        ['المعدات'],
        ['#', 'المعدة', 'الكمية']
    ];

    // إضافة المعدات
    box.items.forEach((item, index) => {
        data.push([index + 1, item.name, item.quantity]);
    });

    // إضافة المعدات المفقودة إذا وجدت
    if (box.missingItems && box.missingItems.length > 0) {
        data.push([]);
        data.push(['المعدات المفقودة']);
        data.push(['#', 'المعدة', 'الكمية المفقودة', 'تاريخ التسجيل']);
        box.missingItems.forEach((item, index) => {
            data.push([index + 1, item.name, item.quantity, formatDate(item.reportDate)]);
        });
    }

    // تحويل البيانات إلى CSV
    const csvContent = data.map(row => row.join(',')).join('\n');
    
    // إنشاء ملف للتحميل
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `صندوق_${box.name || box.receiver}_${formatDate(new Date().toISOString())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// تحسين وظيفة تعديل المخزون
function handleEditItem(event) {
    event.preventDefault();
    const form = event.target;
    const itemId = parseInt(form.id.value);
    const item = state.inventory.find(i => i.id === itemId);
    
    if (!item) return;

    const newQuantity = parseInt(form.quantity.value);
    const oldQuantity = item.quantity;
    const oldName = item.name;
    
    // حساب الكمية المستخدمة الفعلية
    let actualUsed = 0;
    state.boxes.forEach(box => {
        if (box.status === 'active') {
            const boxItem = box.items.find(i => i.id === itemId);
            if (boxItem) {
                actualUsed += boxItem.quantity;
            }
        }
    });

    // التحقق من صحة الكمية الجديدة
    if (newQuantity < actualUsed) {
        showNotification(`لا يمكن تقليل الكمية أقل من ${actualUsed} (الكمية المستخدمة في الصناديق النشطة)`, 'error');
        return;
    }

    item.name = form.name.value;
    item.quantity = newQuantity;
    item.used = actualUsed;

    // إضافة سجل للتغيير
    if (!item.history) {
        item.history = [];
    }

    item.history.push({
        date: new Date().toISOString(),
        oldName,
        newName: item.name,
        oldQuantity,
        newQuantity,
        change: newQuantity - oldQuantity
    });

    addActivity(`تم تعديل معدة ${oldName !== item.name ? `من ${oldName} إلى ${item.name}` : item.name} (الكمية: ${oldQuantity} → ${newQuantity})`, 'inventory');
    showNotification('تم تحديث المعدة بنجاح');
    closeModal('editItemModal');
    renderAll();
    saveData();
}

// عرض النشاطات
function renderActivities() {
    const list = document.getElementById('activitiesList');
    const search = document.getElementById('activitySearch').value.toLowerCase();
    const filter = document.getElementById('activityFilter').value;

    let activities = state.activities;

    // تطبيق التصفية
    if (filter) {
        activities = activities.filter(activity => activity.category === filter);
    }

    // تطبيق البحث
    if (search) {
        activities = activities.filter(activity => 
            activity.text.toLowerCase().includes(search)
        );
    }

    list.innerHTML = activities.map(activity => {
        const details = getActivityDetails(activity);
        return `
            <div class="activity-item ${details.color}">
                <div class="activity-icon">
                    <i class="fas ${details.icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text">
                        <strong>${details.description}</strong>
                        <p>${activity.text}</p>
                    </div>
                    <div class="activity-meta">
                        <span class="activity-date">${formatDate(activity.date)}</span>
                        <span class="activity-category ${activity.category}">
                            ${getCategoryName(activity.category)}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// الحصول على تفاصيل النشاط
function getActivityDetails(activity) {
    const details = {
        icon: '',
        color: '',
        description: ''
    };

    switch (activity.category) {
        case 'box':
            if (activity.text.includes('إضافة')) {
                details.icon = 'fa-plus-circle';
                details.color = 'success';
                details.description = 'تم إنشاء صندوق جديد';
            } else if (activity.text.includes('تعديل')) {
                details.icon = 'fa-edit';
                details.color = 'warning';
                details.description = 'تم تحديث بيانات الصندوق';
            } else if (activity.text.includes('إرجاع')) {
                details.icon = 'fa-undo';
                details.color = 'info';
                details.description = 'تم إرجاع الصندوق';
            } else if (activity.text.includes('حذف')) {
                details.icon = 'fa-trash';
                details.color = 'danger';
                details.description = 'تم حذف الصندوق';
            }
            break;
        case 'inventory':
            if (activity.text.includes('إضافة')) {
                details.icon = 'fa-plus-circle';
                details.color = 'success';
                details.description = 'تم إضافة معدة جديدة للمخزون';
            } else if (activity.text.includes('تعديل')) {
                details.icon = 'fa-edit';
                details.color = 'warning';
                details.description = 'تم تحديث كمية المخزون';
            } else if (activity.text.includes('حذف')) {
                details.icon = 'fa-trash';
                details.color = 'danger';
                details.description = 'تم حذف معدة من المخزون';
            }
            break;
        case 'missing':
            if (activity.text.includes('تسجيل نقص')) {
                details.icon = 'fa-exclamation-triangle';
                details.color = 'danger';
                details.description = 'تم تسجيل معدة مفقودة';
            } else if (activity.text.includes('حل مشكلة')) {
                details.icon = 'fa-check-circle';
                details.color = 'success';
                details.description = 'تم حل مشكلة نقص معدة';
            }
            break;
    }

    return details;
}

// تحديث renderAll
function renderAll() {
    renderInventory();
    renderBoxes();
    renderExpiredBoxes();
    renderMissingItems();
    renderActivities();
}

// إضافة مستمعي الأحداث للتصفية
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    
    // مستمعي أحداث التصفية
    document.getElementById('activitySearch').addEventListener('input', renderActivities);
    document.getElementById('activityFilter').addEventListener('change', renderActivities);
});

// دالة تنسيق التاريخ
function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// التحقق من صحة النموذج
function validateBoxForm(name, receiver) {
    return name.trim() !== '' || receiver.trim() !== '';
}

// إضافة صندوق جديد
function handleAddBox(event) {
    event.preventDefault();
    const form = event.target;
    const name = form.name.value;
    const receiver = form.receiver.value;
    
    if (!validateBoxForm(name, receiver)) {
        showNotification('يجب إدخال الاسم أو المستلم على الأقل', 'error');
        return;
    }

    // التحقق من المعدات المتاحة
    const itemElements = form.querySelectorAll('#boxItems .form-group');
    const items = Array.from(itemElements).map(element => {
        const select = element.querySelector('select');
        const input = element.querySelector('input[type="number"]');
        const item = state.inventory.find(i => i.id === parseInt(select.value));
        return {
            id: item.id,
            name: item.name,
            quantity: parseInt(input.value)
        };
    });

    if (items.length === 0) {
        showNotification('يجب إضافة معدة واحدة على الأقل', 'error');
        return;
    }

    // التحقق من توفر الكميات
    for (const item of items) {
        const inventoryItem = state.inventory.find(i => i.id === item.id);
        if (inventoryItem.quantity - inventoryItem.used < item.quantity) {
            showNotification(`الكمية المطلوبة من ${item.name} غير متوفرة`, 'error');
            return;
        }
    }

    // تحديث المخزون
    for (const item of items) {
        const inventoryItem = state.inventory.find(i => i.id === item.id);
        inventoryItem.used += item.quantity;
    }

    // إضافة الصندوق
    const box = {
        id: Date.now(),
        name: name,
        receiver: receiver,
        location: form.location.value,
        items: items,
        status: 'active',
        createdAt: new Date().toISOString(),
        returnedAt: null
    };

    state.boxes.push(box);
    showNotification('تم إضافة الصندوق بنجاح');
    addActivity(`تم إضافة صندوق جديد: ${box.name || box.receiver}`);
    closeModal('addBoxModal');
    renderAll();
    saveData();
}

// تعديل صندوق
function editBox(boxId) {
    const box = state.boxes.find(b => b.id === boxId);
    if (!box || box.status !== 'active') return;

    document.getElementById('editBoxId').value = box.id;
    document.getElementById('editBoxName').value = box.name || '';
    document.getElementById('editBoxReceiver').value = box.receiver || '';
    document.getElementById('editBoxLocation').value = box.location || '';

    const itemsContainer = document.getElementById('editBoxItems');
    itemsContainer.innerHTML = '';
    
    box.items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'form-group';
        itemDiv.innerHTML = `
            <div style="display: flex; gap: 1rem; align-items: flex-end">
                <div style="flex: 1">
                    <label>المعدة</label>
                    <select required>
                        <option value="">اختر معدة</option>
                        ${state.inventory.map(invItem => `
                            <option value="${invItem.id}" ${invItem.id === item.id ? 'selected' : ''}>
                                ${invItem.name} (متاح: ${invItem.quantity - invItem.used})
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div>
                    <label>الكمية</label>
                    <input type="number" min="1" value="${item.quantity}" required>
                </div>
                <button type="button" class="btn danger" onclick="this.parentElement.parentElement.remove()">حذف</button>
            </div>
        `;
        itemsContainer.appendChild(itemDiv);
    });
    
    showModal('editBoxModal');
}

function handleEditBox(event) {
    event.preventDefault();
    const form = event.target;
    const boxId = parseInt(form.id.value);
    const name = form.name.value;
    const receiver = form.receiver.value;
    
    if (!validateBoxForm(name, receiver)) {
        showNotification('يجب إدخال الاسم أو المستلم على الأقل', 'error');
        return;
    }

    const box = state.boxes.find(b => b.id === boxId);
    if (!box || box.status !== 'active') return;

    // إعادة المعدات القديمة للمخزون
    for (const item of box.items) {
        const inventoryItem = state.inventory.find(i => i.id === item.id);
        if (inventoryItem) {
            inventoryItem.used -= item.quantity;
        }
    }

    // جمع المعدات الجديدة
    const itemElements = form.querySelectorAll('#editBoxItems .form-group');
    const newItems = Array.from(itemElements).map(element => {
        const select = element.querySelector('select');
        const input = element.querySelector('input[type="number"]');
        const item = state.inventory.find(i => i.id === parseInt(select.value));
        return {
            id: item.id,
            name: item.name,
            quantity: parseInt(input.value)
        };
    });

    if (newItems.length === 0) {
        showNotification('يجب إضافة معدة واحدة على الأقل', 'error');
        // إعادة الكميات القديمة للاستخدام
        for (const oldItem of box.items) {
            const invItem = state.inventory.find(i => i.id === oldItem.id);
            if (invItem) {
                invItem.used += oldItem.quantity;
            }
        }
        return;
    }

    // التحقق من توفر الكميات الجديدة
    for (const item of newItems) {
        const inventoryItem = state.inventory.find(i => i.id === item.id);
        if (inventoryItem.quantity - inventoryItem.used < item.quantity) {
            showNotification(`الكمية المطلوبة من ${item.name} غير متوفرة`, 'error');
            // إعادة الكميات القديمة للاستخدام
            for (const oldItem of box.items) {
                const invItem = state.inventory.find(i => i.id === oldItem.id);
                if (invItem) {
                    invItem.used += oldItem.quantity;
                }
            }
            return;
        }
    }

    // تحديث المخزون بالكميات الجديدة
    for (const item of newItems) {
        const inventoryItem = state.inventory.find(i => i.id === item.id);
        inventoryItem.used += item.quantity;
    }

    // تحديث بيانات الصندوق
    box.name = name;
    box.receiver = receiver;
    box.location = form.location.value;
    box.items = newItems;

    showNotification('تم تحديث الصندوق بنجاح');
    addActivity(`تم تعديل صندوق: ${box.name || box.receiver}`);
    closeModal('editBoxModal');
    renderAll();
    saveData();
}

// حذف صندوق
function deleteBox(boxId) {
    const box = state.boxes.find(b => b.id === boxId);
    if (!box || box.status !== 'active') return;

    if (confirm(`هل أنت متأكد من حذف الصندوق؟`)) {
        // إرجاع المعدات للمخزون
        for (const item of box.items) {
            const inventoryItem = state.inventory.find(i => i.id === item.id);
            if (inventoryItem) {
                inventoryItem.used -= item.quantity;
            }
        }

        // حذف الصندوق
        state.boxes = state.boxes.filter(b => b.id !== boxId);
        showNotification('تم حذف الصندوق بنجاح');
        addActivity(`تم حذف صندوق: ${box.name || box.receiver}`);
        renderAll();
        saveData();
    }
}

// تحديث عداد النواقص
function updateMissingItemsCounter() {
    const counter = document.getElementById('missingItemsCounter');
    const missingCount = state.boxes.reduce((total, box) => {
        return total + (box.missingItems?.length || 0);
    }, 0);
    
    if (missingCount > 0) {
        counter.textContent = missingCount;
        counter.style.display = 'flex';
        document.getElementById('clearMissingBtn').style.display = 'inline-flex';
    } else {
        counter.style.display = 'none';
        document.getElementById('clearMissingBtn').style.display = 'none';
    }
}

// مسح إشعار النواقص
function clearMissingNotification() {
    document.getElementById('missingItemsCounter').style.display = 'none';
    document.getElementById('clearMissingBtn').style.display = 'none';
}

// تحسين الإشعارات
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.getElementById('notifications').appendChild(notification);
    
    // تأثير حركي عند الإزالة
    setTimeout(() => {
        notification.classList.add('hiding');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// أيقونات الإشعارات
function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}

// تحسين تبديل الأقسام
function showSection(sectionId) {
    // إخفاء كل الأقسام
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    
    // إزالة الفئة النشطة من كل الأزرار
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // عرض القسم المطلوب
    const section = document.getElementById(sectionId);
    section.style.display = 'block';
    
    // إضافة تأثير حركي للظهور
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    
    requestAnimationFrame(() => {
        section.style.transition = 'all 0.3s ease';
        section.style.opacity = '1';
        section.style.transform = 'translateY(0)';
    });
    
    // تنشيط الزر المناسب
    const btn = document.querySelector(`button[onclick="showSection('${sectionId}')"]`);
    if (btn) btn.classList.add('active');
    
    // تحديث العنوان
    updateTitle(sectionId);
}

// تحديث عنوان الصفحة
function updateTitle(sectionId) {
    const titles = {
        'inventory': 'المخزون',
        'boxes': 'الصناديق',
        'expiredBoxes': 'الصناديق المنتهية',
        'missingItems': 'نواقص المعدات',
        'activities': 'السجل'
    };
    
    document.title = `نظام المعدات - ${titles[sectionId] || ''}`;
}

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    showSection('inventory');
    toggleView('grid');
});

// تحسين تفاصيل السجل
function addActivity(text, category, details = {}) {
    const activity = {
        id: Date.now(),
        text,
        category,
        date: new Date().toISOString(),
        details
    };

    state.activities.unshift(activity);
    if (state.activities.length > 1000) {
        state.activities.pop();
    }
    
    saveData();
    renderActivities();
}

// تحسين وظائف إضافة النشاط في كل العمليات
function handleDeleteBoxItem(boxId, itemId) {
    const box = state.boxes.find(b => b.id === boxId);
    if (!box) return;

    const itemIndex = box.items.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return;

    const item = box.items[itemIndex];
    const inventoryItem = state.inventory.find(i => i.id === itemId);
    if (inventoryItem) {
        inventoryItem.used -= item.quantity;
    }

    // تحسين تفاصيل النشاط
    addActivity(
        `تم حذف ${item.name} من صندوق ${box.name || box.receiver}`,
        'box',
        {
            action: 'delete_item',
            boxId,
            boxName: box.name || box.receiver,
            itemId,
            itemName: item.name,
            quantity: item.quantity,
            location: box.location
        }
    );

    box.items.splice(itemIndex, 1);
    showNotification('تم حذف المعدة من الصندوق');
    renderAll();
    saveData();
}

function handleAddBoxItem(event) {
    event.preventDefault();
    const form = event.target;
    const boxId = parseInt(form.boxId.value);
    const itemId = parseInt(form.itemId.value);
    const quantity = parseInt(form.quantity.value);

    const box = state.boxes.find(b => b.id === boxId);
    const inventoryItem = state.inventory.find(i => i.id === itemId);

    if (!box || !inventoryItem) return;

    if (inventoryItem.quantity - inventoryItem.used < quantity) {
        showNotification('الكمية المتوفرة غير كافية', 'error');
        return;
    }

    const existingItem = box.items.find(i => i.id === itemId);
    if (existingItem) {
        existingItem.quantity += quantity;
        addActivity(
            `تم زيادة كمية ${inventoryItem.name} في صندوق ${box.name || box.receiver} (${quantity}+)`,
            'box',
            {
                action: 'increase_quantity',
                boxId,
                boxName: box.name || box.receiver,
                itemId,
                itemName: inventoryItem.name,
                oldQuantity: existingItem.quantity - quantity,
                newQuantity: existingItem.quantity,
                change: quantity,
                location: box.location
            }
        );
    } else {
        box.items.push({
            id: itemId,
            name: inventoryItem.name,
            quantity
        });
        addActivity(
            `تم إضافة ${inventoryItem.name} إلى صندوق ${box.name || box.receiver} (${quantity})`,
            'box',
            {
                action: 'add_item',
                boxId,
                boxName: box.name || box.receiver,
                itemId,
                itemName: inventoryItem.name,
                quantity,
                location: box.location
            }
        );
    }

    inventoryItem.used += quantity;
    showNotification('تم إضافة المعدة للصندوق');
    closeModal('addBoxItemModal');
    renderAll();
    saveData();
}

function handleAddMissingItem(event) {
    event.preventDefault();
    const form = event.target;
    const name = form.name.value;
    const quantity = parseInt(form.quantity.value);
    const notes = form.notes.value;

    const missingItem = {
        id: Date.now(),
        name,
        quantity,
        notes,
        reportDate: new Date().toISOString(),
        status: 'pending'
    };

    if (!state.missingItems) {
        state.missingItems = [];
    }

    state.missingItems.push(missingItem);
    
    addActivity(
        `تم تسجيل نقص ${name} (${quantity})${notes ? ` - ${notes}` : ''}`,
        'missing',
        {
            action: 'report_missing',
            itemName: name,
            quantity,
            notes,
            status: 'pending'
        }
    );

    showNotification('تم تسجيل النواقص بنجاح');
    closeModal('addMissingItemModal');
    renderAll();
    saveData();
}

// تحسين عرض النشاطات
function renderActivities() {
    const list = document.getElementById('activitiesList');
    const search = document.getElementById('activitySearch').value.toLowerCase();
    const filter = document.getElementById('activityFilter').value;

    let activities = state.activities;

    if (filter) {
        activities = activities.filter(activity => activity.category === filter);
    }

    if (search) {
        activities = activities.filter(activity => 
            activity.text.toLowerCase().includes(search) ||
            (activity.details?.itemName || '').toLowerCase().includes(search) ||
            (activity.details?.boxName || '').toLowerCase().includes(search)
        );
    }

    list.innerHTML = activities.map(activity => {
        const details = getActivityDetails(activity);
        return `
            <div class="activity-item ${details.color}">
                <div class="activity-icon">
                    <i class="fas ${details.icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text">
                        <strong>${details.description}</strong>
                        <p>${activity.text}</p>
                        ${getActivityExtraDetails(activity)}
                    </div>
                    <div class="activity-meta">
                        <span class="activity-date">${formatDate(activity.date)}</span>
                        <span class="activity-category ${activity.category}">
                            ${getCategoryName(activity.category)}
                        </span>
                        ${activity.details?.location ? `
                            <span class="activity-location">
                                <i class="fas fa-map-marker-alt"></i>
                                ${activity.details.location}
                            </span>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// إضافة تفاصيل إضافية للنشاط
function getActivityExtraDetails(activity) {
    if (!activity.details) return '';

    let extraDetails = '';

    switch (activity.details.action) {
        case 'delete_item':
        case 'add_item':
            extraDetails = `
                <div class="activity-extra">
                    <span class="quantity-change">
                        <i class="fas fa-${activity.details.action === 'delete_item' ? 'minus' : 'plus'}-circle"></i>
                        ${activity.details.quantity} قطعة
                    </span>
                </div>
            `;
            break;
        case 'increase_quantity':
            extraDetails = `
                <div class="activity-extra">
                    <span class="quantity-change">
                        <i class="fas fa-arrow-up"></i>
                        من ${activity.details.oldQuantity} إلى ${activity.details.newQuantity}
                        (${activity.details.change}+)
                    </span>
                </div>
            `;
            break;
        case 'report_missing':
            extraDetails = `
                <div class="activity-extra">
                    <span class="missing-status ${activity.details.status}">
                        <i class="fas fa-${activity.details.status === 'pending' ? 'clock' : 'check'}-circle"></i>
                        ${activity.details.status === 'pending' ? 'قيد الانتظار' : 'تم التعويض'}
                    </span>
                </div>
            `;
            break;
    }

    return extraDetails;
}

// تحسين إضافة معدة في نموذج تعديل الصندوق
function addEditBoxItem() {
    const editBoxItems = document.getElementById('editBoxItems');
    const itemCount = editBoxItems.children.length;
    
    const itemDiv = document.createElement('div');
    itemDiv.className = 'edit-box-item';
    itemDiv.innerHTML = `
        <div class="form-group">
            <select name="items[${itemCount}][id]" required onchange="updateEditBoxItemQuantity(this)">
                <option value="">اختر معدة</option>
                ${state.inventory.map(item => `
                    <option value="${item.id}" 
                        data-available="${item.quantity - item.used}"
                        data-name="${item.name}">
                        ${item.name} (متاح: ${item.quantity - item.used})
                    </option>
                `).join('')}
            </select>
        </div>
        <div class="form-group">
            <input type="number" name="items[${itemCount}][quantity]" 
                placeholder="الكمية" required min="1" 
                onchange="validateEditBoxItemQuantity(this)">
        </div>
        <button type="button" class="btn danger" onclick="removeEditBoxItem(this)">
            <i class="fas fa-trash"></i>
        </button>
    `;
    
    editBoxItems.appendChild(itemDiv);
}

// تحديث الكمية المتاحة عند اختيار المعدة
function updateEditBoxItemQuantity(select) {
    const quantityInput = select.parentElement.nextElementSibling.querySelector('input');
    const selectedOption = select.options[select.selectedIndex];
    
    if (selectedOption.value) {
        const available = parseInt(selectedOption.dataset.available);
        quantityInput.max = available;
        quantityInput.value = Math.min(quantityInput.value || 1, available);
    }
}

// التحقق من صحة الكمية
function validateEditBoxItemQuantity(input) {
    const select = input.parentElement.previousElementSibling.querySelector('select');
    const selectedOption = select.options[select.selectedIndex];
    
    if (selectedOption.value) {
        const available = parseInt(selectedOption.dataset.available);
        if (parseInt(input.value) > available) {
            input.value = available;
            showNotification(`الكمية المتاحة من ${selectedOption.dataset.name} هي ${available} فقط`, 'warning');
        }
    }
}

// حذف معدة من نموذج التعديل
function removeEditBoxItem(button) {
    button.closest('.edit-box-item').remove();
}

// تحسين معالجة تعديل الصندوق
function handleEditBox(event) {
    event.preventDefault();
    const form = event.target;
    const boxId = parseInt(form.id.value);
    const box = state.boxes.find(b => b.id === boxId);
    
    if (!box) return;

    // تحديث معلومات الصندوق
    const oldName = box.name;
    const oldReceiver = box.receiver;
    const oldLocation = box.location;

    box.name = form.name.value;
    box.receiver = form.receiver.value;
    box.location = form.location.value;

    // جمع المعدات الجديدة
    const newItems = [];
    const itemElements = form.querySelectorAll('.edit-box-item');
    
    itemElements.forEach(itemElement => {
        const select = itemElement.querySelector('select');
        const quantityInput = itemElement.querySelector('input[type="number"]');
        
        if (select.value && quantityInput.value) {
            const itemId = parseInt(select.value);
            const quantity = parseInt(quantityInput.value);
            const inventoryItem = state.inventory.find(i => i.id === itemId);
            
            if (inventoryItem) {
                newItems.push({
                    id: itemId,
                    name: inventoryItem.name,
                    quantity: quantity
                });
            }
        }
    });

    // تحديث الكميات في المخزون
    box.items.forEach(oldItem => {
        const inventoryItem = state.inventory.find(i => i.id === oldItem.id);
        if (inventoryItem) {
            inventoryItem.used -= oldItem.quantity;
        }
    });

    // تحديث المعدات وإضافة النشاط
    box.items = newItems;
    
    // تحديث الكميات الجديدة في المخزون
    newItems.forEach(newItem => {
        const inventoryItem = state.inventory.find(i => i.id === newItem.id);
        if (inventoryItem) {
            inventoryItem.used += newItem.quantity;
        }
    });

    // إضافة نشاط التعديل
    const changes = [];
    if (box.name !== oldName) {
        changes.push(`تغيير الاسم من "${oldName || '-'}" إلى "${box.name || '-'}"`);
    }
    if (box.receiver !== oldReceiver) {
        changes.push(`تغيير المستلم من "${oldReceiver || '-'}" إلى "${box.receiver || '-'}"`);
    }
    if (box.location !== oldLocation) {
        changes.push(`تغيير الموقع من "${oldLocation || '-'}" إلى "${box.location || '-'}"`);
    }

    addActivity(
        `تم تعديل صندوق ${box.name || box.receiver}${changes.length ? `: ${changes.join('، ')}` : ''}`,
        'box',
        {
            action: 'edit_box',
            boxId,
            boxName: box.name || box.receiver,
            changes,
            location: box.location
        }
    );

    showNotification('تم تحديث الصندوق بنجاح');
    closeModal('editBoxModal');
    renderAll();
    saveData();
}

// تحسين عرض نموذج تعديل الصندوق
function showEditBox(boxId) {
    const box = state.boxes.find(b => b.id === boxId);
    if (!box) return;

    document.getElementById('editBoxId').value = boxId;
    document.getElementById('editBoxName').value = box.name || '';
    document.getElementById('editBoxReceiver').value = box.receiver || '';
    document.getElementById('editBoxLocation').value = box.location || '';

    const itemsContainer = document.getElementById('editBoxItems');
    itemsContainer.innerHTML = '';

    box.items.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'edit-box-item';
        itemDiv.innerHTML = `
            <div class="form-group">
                <select name="items[${index}][id]" required onchange="updateEditBoxItemQuantity(this)">
                    <option value="">اختر معدة</option>
                    ${state.inventory.map(invItem => `
                        <option value="${invItem.id}" 
                            data-available="${invItem.quantity - invItem.used + (invItem.id === item.id ? item.quantity : 0)}"
                            data-name="${invItem.name}"
                            ${invItem.id === item.id ? 'selected' : ''}>
                            ${invItem.name} (متوفر: ${invItem.quantity - invItem.used + (invItem.id === item.id ? item.quantity : 0)})
                        </option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <input type="number" name="items[${index}][quantity]" 
                    value="${item.quantity}" required min="1"
                    onchange="validateEditBoxItemQuantity(this)">
            </div>
            <button type="button" class="btn danger" onclick="removeEditBoxItem(this)">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        itemsContainer.appendChild(itemDiv);
    });

    showModal('editBoxModal');
}

// تحسين دالة البحث
function filterItems(searchTerm) {
    searchTerm = searchTerm.trim().toLowerCase();
    
    // البحث في المخزون
    const inventoryResults = state.inventory.filter(item => 
        item.name.toLowerCase().includes(searchTerm) ||
        item.description?.toLowerCase().includes(searchTerm) ||
        item.category?.toLowerCase().includes(searchTerm)
    );

    // البحث في الصناديق
    const boxResults = state.boxes.filter(box => 
        box.name?.toLowerCase().includes(searchTerm) ||
        box.receiver?.toLowerCase().includes(searchTerm) ||
        box.location?.toLowerCase().includes(searchTerm) ||
        box.items.some(item => item.name.toLowerCase().includes(searchTerm))
    );

    // البحث في النواقص
    const missingResults = state.missingItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm) ||
        item.description?.toLowerCase().includes(searchTerm) ||
        item.location?.toLowerCase().includes(searchTerm) ||
        item.status?.toLowerCase().includes(searchTerm)
    );

    // البحث في السجل
    const activityResults = state.activities.filter(activity =>
        activity.description.toLowerCase().includes(searchTerm) ||
        activity.details?.location?.toLowerCase().includes(searchTerm) ||
        activity.details?.boxName?.toLowerCase().includes(searchTerm) ||
        activity.details?.itemName?.toLowerCase().includes(searchTerm)
    );

    // عرض النتائج
    document.getElementById('inventoryList').innerHTML = inventoryResults.map(item => createInventoryItemHTML(item)).join('');
    document.getElementById('boxesList').innerHTML = boxResults.map(box => createBoxHTML(box)).join('');
    document.getElementById('missingList').innerHTML = missingResults.map(item => createMissingItemHTML(item)).join('');
    document.getElementById('activityList').innerHTML = activityResults.map(activity => createActivityHTML(activity)).join('');

    // تحديث العدادات
    updateCounters();
}

// تحسين عرض المعدات المفقودة
function createMissingItemHTML(item) {
    const resolvedClass = item.status === 'resolved' ? 'resolved' : '';
    const resolvedIcon = item.status === 'resolved' ? 'check-circle' : 'exclamation-circle';
    const resolvedText = item.status === 'resolved' ? 'تم التعويض' : 'قيد الانتظار';
    
    return `
        <div class="missing-item ${resolvedClass}" data-id="${item.id}">
            <div class="item-details">
                <h3>${item.name}</h3>
                <p class="location"><i class="fas fa-map-marker-alt"></i> ${item.location || 'غير محدد'}</p>
                ${item.description ? `<p class="description">${item.description}</p>` : ''}
                <div class="status">
                    <i class="fas fa-${resolvedIcon}"></i> ${resolvedText}
                </div>
                ${item.replacedWith ? `
                    <div class="replacement-info">
                        <i class="fas fa-exchange-alt"></i> تم التعويض بـ: ${item.replacedWith}
                    </div>
                ` : ''}
            </div>
            <div class="actions">
                ${item.status !== 'resolved' ? `
                    <button class="btn success" onclick="resolveMissingItem(${item.id})">
                        <i class="fas fa-check"></i> تم التعويض
                    </button>
                ` : ''}
                <button class="btn danger" onclick="deleteMissingItem(${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

// تحسين عرض نشاطات السجل مع إضافة زر الاسترجاع
function createActivityHTML(activity) {
    const date = new Date(activity.timestamp);
    const timeString = date.toLocaleTimeString('ar-EG');
    const dateString = date.toLocaleDateString('ar-EG');
    
    let extraDetails = getActivityExtraDetails(activity);
    let restoreButton = '';

    // إضافة زر الاسترجاع للصناديق المحذوفة
    if (activity.type === 'box' && 
        (activity.details?.action === 'delete' || activity.details?.action === 'return') && 
        activity.details?.boxData) {
        restoreButton = `
            <button class="btn primary restore-btn" onclick="restoreBox(${activity.id})">
                <i class="fas fa-undo"></i> استرجاع الصندوق
            </button>
        `;
    }

    return `
        <div class="activity-item ${activity.type}" data-id="${activity.id}">
            <div class="activity-icon">
                <i class="fas ${getActivityIcon(activity.type)}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-header">
                    <span class="activity-time">${timeString}</span>
                    <span class="activity-date">${dateString}</span>
                </div>
                <div class="activity-description">${activity.description}</div>
                ${extraDetails ? `<div class="activity-details">${extraDetails}</div>` : ''}
                ${restoreButton}
            </div>
        </div>
    `;
}

// إضافة وظيفة استرجاع الصندوق
function restoreBox(activityId) {
    const activity = state.activities.find(a => a.id === activityId);
    if (!activity || !activity.details?.boxData) return;

    const boxData = activity.details.boxData;
    
    // إعادة إضافة الصندوق إلى القائمة
    state.boxes.push({
        ...boxData,
        id: Date.now() // إنشاء معرف جديد للصندوق
    });

    // تحديث الكميات في المخزون
    boxData.items.forEach(item => {
        const inventoryItem = state.inventory.find(i => i.id === item.id);
        if (inventoryItem) {
            inventoryItem.used += item.quantity;
        }
    });

    // إضافة نشاط الاسترجاع
    addActivity(
        `تم استرجاع صندوق ${boxData.name || boxData.receiver}`,
        'box',
        {
            action: 'restore',
            boxId: boxData.id,
            boxName: boxData.name || boxData.receiver,
            location: boxData.location
        }
    );

    showNotification('تم استرجاع الصندوق بنجاح');
    renderAll();
    saveData();
}

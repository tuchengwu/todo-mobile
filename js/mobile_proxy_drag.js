//存取localstorage的键
const STORAGE_KEY = "todo-items";
const MSG_KEY="msg";
//用于在内存中保存变量
var items = [];
var currentMsg ='';
var currentFilter = "All";
var leftItemsNumber=0;
var currentState = true;
//定义被拖动的项与滑动的起始y坐标
var dragIndex = -1;
var beginy = -1;
//代理items的变化
var arrayChangeHandler = {
	get: function(target,property) {
		return target[property];
	},set: function(target,property,value,receiver) {

		target[property] = value;
		saveItems(items);
		flush();
		return true;
	}
};
//一些语法糖
function $(sel){
	return document.querySelector(sel);
}
function $all(sel){
	return document.querySelectorAll(sel);
}
//操作本地存储的方法
function fetchItems(){
	if(localStorage.getItem(STORAGE_KEY)==="undefined"){
		return [];
	}
	return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}
function saveItems(items){
	localStorage.setItem(STORAGE_KEY,JSON.stringify(items));
}
function fetchMsg(){
	return JSON.parse(localStorage.getItem(MSG_KEY) || '[]');
}
function saveMsg(msg){
	localStorage.setItem(MSG_KEY,JSON.stringify(msg));
}
//初始化
function init(){
	items = new Proxy(fetchItems(),arrayChangeHandler);
	currentMsg=fetchMsg();
	$(".new-todo").value=currentMsg;
	flush();
}
//视图管理
//todo数量更新和清除按钮的显示
function updateNumber() {
	//更新显示剩余active的数量
	leftItemsNumber=0;
	let haveCompleted = false;
	items.forEach(function (item) {
		if(item.completed===false){
			leftItemsNumber++;
		}
		else{
			haveCompleted=true;
		}
	});
	$(".todo-count").innerText=leftItemsNumber+"  item"+(leftItemsNumber>1?"s" : '')+"  left";
	//根据是否剩余completed来更改按钮的显示
	if(!haveCompleted){
		$(".clear-completed").style.display="none";
	}
	else{
		$(".clear-completed").style.display="inline";
	}
}
//todo列表的更新与每个item的事件绑定
function drawItems(){
	var todoList = $(".todo-list");
	todoList.innerHTML='';
	items.forEach(function (item,index) {
		//筛选需要绘制的item
		if(currentFilter=="All"
		|| (currentFilter=="Active" && !item.completed)
		|| (currentFilter=="Completed" && item.completed)){
			//首先将对应的html元素创建出来，包括切换，标签，复制按钮，删除按钮
			var itemLi = document.createElement("li");
			var id ="item"+index;
			itemLi.setAttribute("id",id);
			if (item.completed) itemLi.classList.add("completed");
			itemLi.innerHTML = [
				'<div class="view" draggable="true">',
				'  <input class="toggle" type="checkbox">',
				'  <label class="todo-label">' + item.name + '</label>',
				'  <button class="duplicate"></button>',
				'  <button class="destroy"></button>',
				'</div>'
			].join('');
			//拖拽互换功能，仅在pc端浏览器上使用
			itemLi.querySelector(".view").addEventListener("dragover",function (ev) {
				ev.preventDefault();
			});
			itemLi.querySelector(".view").addEventListener("drop",function (ev) {
				var temp = ev.target.parentNode.parentNode.id;
				var tempIndex = parseInt(temp.substring(4));
				[items[tempIndex],items[dragIndex]]=[items[dragIndex],items[tempIndex]];
				dragIndex=-1;
			});
			itemLi.querySelector(".view").addEventListener("dragstart",function (ev) {
				dragIndex=index;
			});
			//上下滑动相邻位置互换功能，在移动端上使用
			itemLi.querySelector(".view").addEventListener("touchend",function (ev) {
				//获取停止滑动时的y坐标
				let y=ev.changedTouches[0].pageY;
				//如果是单击事件则不做改变，执行其他操作
				if(y==beginy){
					return;
				}
				//如果是上滑，与上边的元素互换
				if(y<beginy && dragIndex<items.length-1){
					[items[dragIndex+1],items[dragIndex]]=[items[dragIndex],items[dragIndex+1]];
				}
				//如果是下滑，与下边的元素互换
				else if(dragIndex>0 && y>beginy){
					[items[dragIndex-1],items[dragIndex]]=[items[dragIndex],items[dragIndex-1]];
				}
			});
			itemLi.querySelector(".view").addEventListener("touchmove",function (ev) {
				ev.preventDefault();
			});
			itemLi.querySelector(".view").addEventListener("touchstart",function (ev) {
				//保存滑动开始的元素与y坐标
				dragIndex=index;
				beginy = ev.touches[0].pageY;


			});
			//编辑功能
			var label = itemLi.querySelector('.todo-label');
			//双击显示编辑框
			label.addEventListener('dblclick', function() {
				itemLi.classList.add("editing");
				var edit = document.createElement('input');
				var finished = false;
				edit.setAttribute('type', 'text');
				edit.setAttribute('class', 'edit');
				edit.setAttribute('value', label.innerHTML);

				function finish() {
					if (finished) return;
					finished = true;
					itemLi.removeChild(edit);
					itemLi.classList.remove("editing");
				}

				edit.addEventListener('blur', function() {
					finish();
				}, false);

				edit.addEventListener('keyup', function(ev) {
					//esc键退出编辑状态
					if (ev.keyCode == 27) {
						finish();
					}
					//Enter键应用编辑内容
					else if (ev.keyCode == 13) {
						label.innerHTML = this.value;
						items.splice(index,1,{name:this.value,completed:item.completed});
					}
				}, false);
				itemLi.appendChild(edit);
				edit.focus();
			}, false);
			//切换功能
			var itemToggle = itemLi.querySelector('.toggle');
			//将是否选中与item的状态绑定
			itemToggle.checked = item.completed;
			itemToggle.addEventListener('change', function() {
				//使用splice进行替换来触发proxy
				items.splice(index,1,{name:item.name,completed:!item.completed});
			}, false);
			//删除功能
			var deleteButton = itemLi.querySelector('.destroy');
			deleteButton.addEventListener("click",function () {
				items.splice(index,1);
			},false);
			//复制功能
			var duplicateButton=itemLi.querySelector('.duplicate');
			duplicateButton.addEventListener(("click"),function () {
				items.push({name:item.name,completed:false});
			});
			//反序添加
			todoList.insertBefore(itemLi, todoList.firstChild);
		}
	})
}
//封装成一个方法供调用
function flush(){
	updateNumber();
	drawItems();
}
//事件绑定与初始化等
window.onload=function () {
	init();
	//当输入新建框的内容改变时同步到内存与localstorage
	$(".new-todo").addEventListener("keyup",function () {
		currentMsg=$(".new-todo").value;
		saveMsg(currentMsg);
	});
	//添加时的监听器
	$(".new-todo").addEventListener("keyup",function (event) {
		if(event.keyCode !==13){
			return ;
		}
		//添加操作
		else{
			if(event.ctrlKey){
				items=new Proxy(items.filter(item=> item.name.indexOf(currentMsg) === -1),arrayChangeHandler);
				currentMsg='';
				$(".new-todo").value=currentMsg;
				saveItems(items);
				saveMsg(currentMsg);
				flush();
				return;
			}
			if(currentMsg==''){
				console.log("添加的todo名为空");
			}
			else{
				items.push({name :currentMsg,completed:false});
				//将输入框置空并同步
				currentMsg='';
				$(".new-todo").value=currentMsg;
				saveMsg(currentMsg);
				saveItems(items);
			}
		}
	});
	//全部切换按钮监听器
	$(".toggle-all").addEventListener("click",function () {
		items.forEach(function (item,index) {
			//同样使用splice替换来进行
			items.splice(index,1,{name:item.name,completed:currentState});
		});
		//记录当前状态
		currentState=!currentState;
	});
	//改变filter与样式
	$all(".filters a").forEach(function (ele) {
		ele.addEventListener("click",function () {
			currentFilter=ele.innerHTML;
			$all(".filters a").forEach(function (element) {
				element.classList.remove("selected");
			});
			ele.classList.add("selected");
			flush();
		})
	});
	//删除completed的项
	$(".clear-completed").addEventListener("click",function () {
		//使用filter方法进行过滤，并封装成proxy保证可以监听到变化
		items=new Proxy(items.filter(item => !item.completed),arrayChangeHandler);
		saveItems();
		//此处对items直接赋值proxy无法监听，所以手动调用一次flush
		flush();
	});
};


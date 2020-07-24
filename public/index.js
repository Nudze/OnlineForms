const request = window.indexedDB.open("forms_database", 1);

request.onerror = () => {
	alert("This page needs to use IndexedDB in order to work properly.");
};

request.onupgradeneeded = (event) => {
	const db = event.target.result;
	db.createObjectStore("forms", {
		keyPath : "name"
	});
};

request.onsuccess = (event) => {
	const db = event.target.result;
	db.close();
};

const [ adminSearch, formsSearch, adminForm, formsForm ] = document.getElementsByTagName("form");
const [ adminBtn, formsBtn ] = document.getElementsByTagName("button");
const main = document.querySelector("main");

//ADMINISTRATION
adminBtn.addEventListener("click", function () {
	formsSearch.style.display = "none";
	adminSearch.style.display = "block";
	formsForm.innerHTML = "";
	this.classList.add("active");
	formsBtn.classList.remove("active");
});
adminBtn.click();

adminSearch.addEventListener("submit", function (event) {
	event.preventDefault();
	const formName = this.querySelector("input").value;
	getAndHandleData(formName, displayFormTemplate);
});

adminForm.addEventListener("submit", function (event) {
	event.preventDefault();
	const input = document.querySelector("#search-admin input");
	const formName = input.value;
	if (formName) {
		const fields = this.getElementsByTagName("fieldset");
		getAndHandleData(formName, saveFormTemplate, fields);
	} else {
		alert("Please name the form.");
		input.focus();
	}
});

function getAndHandleData (name, func, ...args) {
	const request = window.indexedDB.open("forms_database", 1);
	request.onerror = () => {
		alert("This page needs to use IndexedDB in order to work properly.");
	};

	request.onsuccess = (event) => {
		const db = event.target.result;
		const transaction = db.transaction("forms", "readwrite");
		const storage = transaction.objectStore("forms");
		const getForm = storage.get(name);

		db.onerror = () => {
			alert("Something went wrong. Please try again.");
		};

		getForm.onsuccess = (event) => {
			func(event.target.result, ...args, storage, name);
		};

		transaction.oncomplete = () => {
			db.close();
		};
	};
}

function displayFormTemplate (form) {
	adminForm.innerHTML = `
	        <button id="new-element">Add New Element</button>
	        <button id="save-form">Save</button>
		`;
	const newBtn = document.querySelector("#new-element");
	let numOfElements = 1;

	if (form) {
		numOfElements = form.template.length;
		form.template.forEach((element, i) => {
			addFieldset(i + 1, newBtn, element);
		});
	} else {
		addFieldset(numOfElements, newBtn);
	}

	newBtn.addEventListener("click", function (event) {
		event.preventDefault();
		numOfElements++;
		addFieldset(numOfElements, this);
	});
}

function addFieldset (num, element, obj = {}) {
	const fieldset = document.createElement("fieldset");
	fieldset.id = `element-${num}`;
	fieldset.innerHTML = fieldsetHTML(num, obj);
	element.insertAdjacentElement("beforebegin", fieldset);
	dropdownEventListener(num, obj.options);
}

function fieldsetHTML (num, obj) {
	const { label = "", type = "text", validation } = obj;
	return `
        <legend>Element ${num}</legend>
        <label>Label's name:
            <input type="text" value="${label}" required>
        </label>
        <label>Element's type:
            <select>
                ${selectOption("text", type, "Text Box")}
                ${selectOption("radio", type, "Radio Button")}
                ${selectOption("checkbox", type, "Checkbox")}
            </select>
        </label>
        <label>Validation type:
            <select>
                ${selectOption("none", validation, "None")}
                ${selectOption("required", validation, "Mandatory")}
                ${selectOption("number", validation, "Number")}
            </select>
        </label>
        <span></span>
        <div></div>
    `;
}

function selectOption (option, selected, placeholder) {
	return `
        <option value="${option}" ${option === selected ? "selected" : ""}>${placeholder}</option>           
    `;
}

function dropdownEventListener (num, options) {
	const select = document.querySelector(`#element-${num} select`);
	const numValidation = document.querySelector(`#element-${num} label:last-of-type select`).options[2];
	select.addEventListener("change", function () {
		const span = document.querySelector(`#element-${num} span`);
		const div = document.querySelector(`#element-${num} div`);
		if (this.value === "radio") {
			span.innerHTML = `
                <label>Number of radio buttons:
                    <input type="number" min="2" value="${options ? options.length : 2}">
                </label>   
            `;
			const input = document.querySelector(`#element-${num} input[type="number"]`);
			input.addEventListener("change", function () {
				div.innerHTML = "";
				for (let i = 0; i < this.value; i++) {
					div.innerHTML += `
                        <label>Option ${i + 1}: 
                            <input type="text" value="${options && options[i] ? options[i] : ""}" required>
                        </label>
                    `;
				}
			});
			input.dispatchEvent(new Event("change"));
		} else {
			span.innerHTML = "";
			div.innerHTML = "";
		}

		if (this.value === "text") {
			numValidation.disabled = false;
			numValidation.classList.remove("disabled");
		} else {
			numValidation.disabled = true;
			numValidation.selected = false;
			numValidation.classList.add("disabled");
		}
	});
	select.dispatchEvent(new Event("change"));
}

function saveFormTemplate (form, fields, storage, name) {
	const updatedForm = updateFormTemplate(form, name, fields);
	const putForm = storage.put(updatedForm);
	putForm.onsuccess = () => {
		alert(`${name} has been successfully saved.`);
	};
}

function updateFormTemplate (form, name, fields) {
	if (!form) {
		form = {};
		form.name = name;
	}
	form.template = [];
	for (const field of fields) {
		const obj = {
			label      : field.elements[0].value,
			type       : field.elements[1].value,
			validation : field.elements[2].value
		};
		if (field.elements[1].value === "radio") {
			obj.options = [];
			for (let i = 4; i < field.elements.length; i++) {
				obj.options.push(field.elements[i].value);
			}
		}
		form.template.push(obj);
	}
	return form;
}

//FORMS
let formName;
formsBtn.addEventListener("click", function () {
	adminSearch.style.display = "none";
	formsSearch.style.display = "block";
	adminForm.innerHTML = "";
	this.classList.add("active");
	adminBtn.classList.remove("active");
});

formsSearch.addEventListener("submit", function (event) {
	event.preventDefault();
	const input = this.querySelector("input");
	formName = input.value;
	getAndHandleData(formName, displayForm, this, input);
});

formsForm.addEventListener("submit", (event) => {
	event.preventDefault();

	const input = document.querySelector("#search-forms input");
	if (formName === input.value) {
		const input = document.querySelector('#search-forms input[type="number"]');
		const version = `version${input.value}`;
		if (input.value !== "") {
			getAndHandleData(formName, saveForm, version);
		} else {
			alert("Which version?");
			input.focus();
		}
	} else {
		alert(`This template is called ${formName} and its version can't be saved under a different name.`);
		input.value = formName;
		input.focus();
	}
});

function displayForm (form, element1, element2) {
	if (form) {
		const input = element1.querySelector('input[type="number"]');
		const version = `version${input.value}`;
		formsForm.innerHTML = "";

		input.value !== "" ? createForm(form, version) : createForm(form);
	} else {
		formsForm.innerHTML = `
            <h1>There is no form with the given name. Please try again.</h1>
        `;
		element2.focus();
	}
}

function createForm (form, version) {
	form.template.forEach((element, i) => {
		if (element.type === "radio") {
			formsForm.innerHTML += `
				<p>${element.label}</p>
			`;
			for (const option of element.options) {
				formsForm.innerHTML += `
					<label>
						<input type="radio" 
						name="${element.label.replace(/\s/g, "-")}" 
						value="${option.replace(/\s/g, "-")}" 
						${element.validation === "required" ? "required" : ""}  
						${form[version] && option.replace(/\s/g, "-") === form[version][i] ? "checked" : ""}>
						${option}
					</label>
				`;
			}
		} else if (element.type === "checkbox") {
			formsForm.innerHTML += `
				<div>
					<label>${element.label}
						<input type="checkbox" 
						name="${element.label.replace(/\s/g, "-")}"
						${element.validation === "required" ? "required" : ""} 
						${form[version] && form[version][i] === "on" ? "checked" : ""}>
					</label>
				</div>
			`;
		} else {
			formsForm.innerHTML += `
				<div>
					<label>${element.label}
						<input type="${element.type}" 
						name="${element.label.replace(/\s/g, "-")}"
						${element.validation === "required" ? "required" : ""} 
						value="${form[version] && form[version][i] ? form[version][i] : ""}">
					</label>
				</div>
			`;
		}
	});

	formsForm.innerHTML += "<button>Save</button>";
}

function saveForm (form, version, storage) {
	if (validateForm(form)) {
		updateForm(form, version);
		const putForm = storage.put(form);
		putForm.onsuccess = () => {
			alert(`Version ${version.substring(7)} of ${form.name} has been successfully saved.`);
		};
	}
}

function validateForm (form) {
	for (const element of form.template) {
		if (element.validation === "number") {
			const input = document.querySelector(`input[name="${element.label.replace(/\s/g, "-")}"]`);
			if (!input.value.match(/^[-+]?[0-9]+$/)) {
				alert(`${element.label} must be a number.`);
				input.focus();
				return false;
			}
		}
	}
	return true;
}

function updateForm (form, version) {
	if (!form[version]) form[version] = [];

	form.template.forEach((element, i) => {
		const inputs = document.getElementsByName(`${element.label.replace(/\s/g, "-")}`);
		if (element.type === "radio") {
			for (const radio of inputs) {
				if (radio.checked) form[version][i] = radio.value;
			}
		} else if (element.type === "checkbox") {
			form[version][i] = inputs[0].checked ? "on" : "off";
		} else {
			form[version][i] = inputs[0].value;
		}
	});
}

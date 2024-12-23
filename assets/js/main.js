function safelyParseJSON(json) {
	var parsed

	try {
		parsed = JSON.parse(json);
		return parsed
	} catch (error) {
		// May be contains CMake defines ?
	}

	json = json.replace(/\${\S+}/g, '');
	json = json.replace(/:\s*,/g, ': null,');

	try {
		parsed = JSON.parse(json);
	} catch (error) {
		// Oh well, but whatever...
		console.error('Failed to parse JSON:', error);
	}

	return parsed
}

function formatType(item) {
	var type = item.type;
	if (item.prototype) {
		if (type.includes('[]')) {
			type = `${item.prototype.name}[]`;
		} else {
			type = item.prototype.name;
		}
	} else if (item.enum) {
		if (type.includes('[]')) {
			type = `${item.enum.name}[]`;
		} else {
			type = item.enum.name;
		}
	}
	if (item.ref && item.ref === true) {
		type += '&';
	}
	return type;
}

function createRow(option, description) {
	return $('<tr>')
		.append(
			$('<th>')
			.addClass('theme-bg-light')
			.append(
				$('<a>')
				.addClass('theme-link')
				.attr('href', `#item-${option}`)
				.text(option)
			)
		)
		.append($('<td>').text(description));
}

function createSection(title, items) {
	const entries = $('<tbody>')
	$.each(items, function(index, item) {
		entries.append(createRow(item.name, item.description))
	});

	const heading = $('<h5>')
		.text(`${title}:`);
	const titleHeading = $('<h5>')
		.text(`${title} Documentation:`);

	const table = $('<table>')
		.addClass('table table-bordered')
		.append(
			entries
		);

	const tableWrapper = $('<div>')
		.addClass('table-responsive my-4')
		.append(table);

	return $('<section>')
		.append('<br>')
		.append(heading, tableWrapper)
		.append(titleHeading);
}

function createParam(item, code, pre, post) {
	const param = $('<strong>');
	if (item.prototype) {
		const link = $('<a>')
			.addClass('me-1 text-green')
			.text(code);
		param.append(link);
		const href = `#item-${item.prototype.name}`;
		link.attr('href', href)
		if (item.name && item.name.length > 0) {
			const name = $('<strong>')
				.addClass('me-1 text-blue')
				.text(item.name);
			param.append(name);
		}		
		pre.html = `<strong><a class="me-1 text-green" href="${href}">`
		post.html = '</a></strong>';
	} else if (item.enum) {
		const link = $('<a>')
			.addClass('me-1 text-green')
			.text(code);
		param.append(link);
		const href = `#item-${item.enum.name}`;
		link.attr('href', href);
		if (item.name && item.name.length > 0) {
			const name = $('<strong>')
				.addClass('me-1 text-blue')
				.text(item.name);
			param.append(name);
		}
		pre.html = `<strong><a class="me-1 text-green" href="${href}">`
		post.html = '</a></strong>';
	} else {
		param.addClass('me-1 text-green')
			.text(code);
		const name = $('<strong>')
			.addClass('me-1 text-blue')
			.text(item.name);
		param.append(name);
		pre.html = '<strong class="me-1 text-green">';
		post.html = '</strong>';
	}
	return param;
}

function createFuncSection(item) {
	var parameterString = '';
	var parameterParts = [];

	const parameterTypes = $('<ul>');
	$.each(item.paramTypes, function(index, item) {
		let pre = { html: '' };
		let post = { html: '' };
		const element = $('<li>');
		const paramCode = formatType(item);
		const paramType = createParam(item, `${paramCode} `, pre, post);
		const paramDesc = $('<p>')
			.css('text-indent', '20px')
			.text(item.description);
		element
			.append(paramType)
			.append(paramDesc);
		parameterTypes.append(element);
		parameterParts.push(`${pre.html}${paramCode}${post.html} <strong class="me-1 text-blue">${item.name}, </strong>`);
	});

	if (parameterParts.length > 0) {
		parameterString = parameterParts.join("")
		parameterString = parameterString.slice(0, -11);
		parameterString += '</strong>';
	}

	let pre = { html: '' };
	let post = { html: '' };
	const returnCode = formatType(item.retType);
	const returnType = createParam(item.retType, `${returnCode} `, pre, post);
	const returnDesc = $('<p>')
		.css('text-indent', '20px')
		.text(item.retType.description);

	const functionCode = $('<code>')
		.html(`${pre.html}${returnCode}${post.html}<strong class="me-1 text-blue"> ${item.name}(</strong>${parameterString}<strong class="me-1 text-blue">)</strong>`);

	return $('<section>')
		.addClass('docs-section')
		.attr('id', `item-${item.name}`)
		.append($('<h2>').addClass('section-heading').text(item.name))
		.append($('<p>').text(item.description))
		.append($('<p>').html(functionCode))
		.append($('<h5>').text('Parameters:'))
		.append(parameterTypes)
		.append($('<h5>').text('Return:'))
		.append(returnType)
		.append(returnDesc);
}

function createEnumSection(item) {
	const newEntries = $('<tbody>')
	$.each(item.values, function(index, item) {
		newEntries.append(createRow(item.name, item.description))
	});

	const table = $('<table>')
		.addClass('table table-bordered')
		.append(
			newEntries
		);

	const tableWrapper = $('<div>')
		.addClass('table-responsive my-4')
		.append(table);

	return $('<section>')
		.addClass('docs-section')
		.attr('id', `item-${item.name}`)
		.append($('<h2>').addClass('section-heading').text(item.name))
		.append($('<p>').text(item.description))
		.append(tableWrapper);
}

function processItem(item, delgs, enums) {
	if (item.prototype) {
		if (!delgs.has(item.prototype.name)) {
			delgs.set(item.prototype.name, item.prototype);
		}
		processMethod(item.prototype, delgs, enums, true);
	} else if (item.enum) {
		if (!enums.has(item.enum.name) && item.enum.values) {
			enums.set(item.enum.name, item.enum);
		}
	}
}

function processMethod(item, delgs, enums) {
	$.each(item.paramTypes, function(index, item) {
		processItem(item, delgs, enums);
	});
	processItem(item.retType, delgs, enums);
}

const searchInput = $('#search-input'); // Поле ввода
const searchList = $('#search-list');  // Выпадающий список для поиска

// Добавление элемента в список поиска
function addSearchEntry(item) {
	const sidebarItem = $('<li>')
		.addClass('nav-item')
		.append(
			$('<a>')
			.addClass(
				'nav-link scrollto')
			.attr('href',
				`#item-${item.name}`
			)
			.attr('id',
				`nav-${item.name}`
			)
			.text(item.name)
		);
	$('#nav-list').append(sidebarItem);

	const searchItem = $('<li>')
		.addClass('dropdown-item')
		.text(item.name)
		.on('mousedown', function (e) {
			e.preventDefault();
			searchInput.val(item.name);
			searchList.hide();
			emitEnter(searchItem);
		});

	searchList.append(searchItem);
}

function emitEnter(inputElement) {
	const enterEvent = new KeyboardEvent('keydown', {
		key: 'Enter',
		code: 'Enter',
		keyCode: 13,
		which: 13,
		bubbles: true
	});
	inputElement[0].dispatchEvent(enterEvent);
}

function loadManifest(jsonURL) {
	$.ajax({
		url: jsonURL,
		type: 'GET',
		dataType: 'text',
		success: function(response) {
			var data = safelyParseJSON(response);

			const groupedData = data.exportedMethods.reduce((acc,
				item) => {
				const group = item.group || data.friendlyName;
				if (!acc[group]) {
					acc[group] = [];
				}
				acc[group].push(item);
				return acc;
			}, {});

			var first = true;

			$.each(groupedData, function(group, items) {
				if (items.length === 0)
					return;
				
				const newSection = $('<li>')
					.addClass(
						'nav-item section-title mt-3')
					.append(
						$('<a>')
						.addClass('nav-link scrollto')
						.attr('href',
							`#section-${group}`)
						.append(
							$('<span>')
							.addClass(
								'theme-icon-holder me-2'
							)
							.append(
								$('<i>').addClass(
									'fas fa-arrow-down')
							)
						)
						.append(group)
					);

				$('#nav-list').append(newSection);
				
				const docsHeading = $('<h1>')
					.addClass('docs-heading')
					.text(group);

				if (first) {
					var d = new Date();
					const spanElement = $('<span>')
						.addClass('docs-time')
						.text(d.toLocaleString());

					docsHeading.append(spanElement);
					first = false;
				}

				const newContainer = $('<article>')
					.addClass('docs-article')
					.attr('id', `section-${group}`)
					.append(
						$('<header>')
						.addClass('docs-header')
						.append(
							docsHeading
						)
					);
					
				const delgs = new Map();
				const enums = new Map();
				
				$.each(items, function(index, item) {
					processMethod(item, delgs, enums);
				});
				
				var funcSection = createSection("Functions", items);
				$.each(items, function(index, item) {
					addSearchEntry(item);
					funcSection.append(createFuncSection(item));
				});
				newContainer.append(funcSection);
				
				if (delgs.size > 0) {
					var delgsSection = createSection("Delegates", Array.from(delgs.values()));
					for (const [_, item] of delgs) {
						addSearchEntry(item);
						delgsSection.append(createFuncSection(item));
					}
					newContainer.append(delgsSection);
				}

				if (enums.size > 0) {
					var enumsSection = createSection("Enumerators", Array.from(enums.values()));
					for (const [_, item] of enums) {
						addSearchEntry(item);
						enumsSection.append(createEnumSection(item));
					}
					newContainer.append(enumsSection);
				}
				
				$('#docs-container').append(newContainer);
			});

			//hljs.highlightAll();
			$('#search-form').show();
			$('#main').show();
			$('#footer').show();
			
			const target = $(`${window.location.hash}`);
			if (target.length) {
				target[0].scrollIntoView();
			}
		},
		error: function(jqxhr, textStatus, error) {
			console.error('Failed to load the file:', textStatus, error);
			$('#submit-form').addClass('was-validated');
			$('#form').show();
			$('#footer').show();
		}
	});
}

function convertToRawUrl(url) {
	if (url.includes('://github.com')) {
		var rawUrl = url
			.replace('://github.com', '://raw.githubusercontent.com')
			.replace('/blob/', '/refs/heads/')
		return rawUrl;
	}
	return url;
}

function generateBody() {
	const urlParams = new URLSearchParams(window.location.search);

	const file = urlParams.get('file');

	$('#spinner').hide();
	if (file) {
		loadManifest(convertToRawUrl(file));
	} else {
		$('#form').show();
		$('#footer').show();
	}
}

$(function() {
	const searchInput = $('#search-input');
	const searchClear = $('#search-clear');
	const searchForm = $('#search-form');

	searchClear.on('click', function() {
		searchInput.val('');
		searchClear.hide();
	});

	searchInput.on('input', function() {
		const value = $(this).val();
		if (value.trim() === '') {
			searchClear.hide();
		} else {
			searchClear.show();
		}
	});

	searchForm.on('keydown', function(event) {
		if (event.key === 'Enter' || event.keyCode === 13) {
			event.preventDefault();
			var search = this['search'].value;
			const target = $(`#nav-${search}`);
			if (target.length) {
				target[0].click();
			}
		}
	});

	searchForm.on('submit', function(event) {
		event.preventDefault();
	});

	searchForm.on('submit', function(event) {
		if (!this.checkValidity()) {
			event.preventDefault();
			event.stopPropagation();
		}
		$(this).addClass('was-validated');

		var link = this['file'].value;
		$.ajax({
			url: link,
			context: document.body
		}).done(function() {
			generateBody();
		});
	});

	searchInput.on('input', function () {
		const query = $(this).val().toLowerCase();
		if (query) {
			searchList.children('li').each(function () {
				const itemText = $(this).text().toLowerCase();
				$(this).toggle(itemText.includes(query));
			});
			searchList.show();
		} else {

			searchList.children('li').show();
			searchList.show();
		}
	});

	searchInput.on('focus', function () {
		if (searchList.children('li').length > 0) {
			searchList.children('li').show();
			searchList.show();
		}
	});

	$(document).on('mousedown', function (e) {
		if (!$(e.target).closest('#search-input').length && !$(e.target).closest('#search-list').length) {
			searchList.hide();
		}
	});

	$(window).on('blur', function () {
		searchList.hide();
	});

	generateBody();
});

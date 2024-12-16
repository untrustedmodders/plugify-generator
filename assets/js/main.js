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
	if (item.ref && item.ref === true) {
		type += '& ';
	} else {
		type += ' ';
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

function createFuncSection(item) {
	var parameterString = '';

	const parameterTypes = $('<ul>');
	$.each(item.paramTypes, function(index, item) {
		const element = $('<li>');
		const paramCode = formatType(item);
		const paramType = $('<strong>')
			.addClass('me-1 text-green')
			.text(paramCode);
		const paramDesc = $('<p>')
			.css('text-indent', '20px')
			.text(item.description);
		if (item.type == 'function' && item.prototype) {
			const paramName = $('<strong>');
			const paramLink = $('<a>')
				.addClass('me-1 text-blue')
				.attr('href', `#item-${item.prototype.name}`)
				.text(item.name);
			paramName.append(paramLink);
			paramType.append(paramName);
		}  else if (item.enum) {
			const paramName = $('<strong>');
			const paramLink = $('<a>')
				.addClass('me-1 text-blue')
				.attr('href', `#item-${item.enum.name}`)
				.text(item.name);
			paramName.append(paramLink);
			paramType.append(paramName);
		} else {
			const paramName = $('<strong>')
				.addClass('me-1 text-blue')
				.text(item.name);
			paramType.append(paramName);
		}
		element
			.append(paramType)
			.append(paramDesc);
		parameterTypes.append(element);
		parameterString += (`${paramCode}${item.name}, `);
	});

	if (parameterString && parameterString.length > 0) {
		parameterString = parameterString.slice(0, -2);
	}

	const returnCode = formatType(item.retType);
	const returnType = $('<strong>')
		.addClass('me-1 text-green')
		.text(returnCode);
	const returnName = $('<strong>')
		.addClass('me-1 text-blue')
		.text(item.retType.name);
	const returnDesc = $('<p>')
		.css('text-indent', '20px')
		.text(item.retType.description);
	returnType.append(returnName)

	const functionCode = $('<pre>').append(
		$('<code>')
		.addClass('language-go')
		.text(`${returnCode}${item.name}(${parameterString})`)
	);

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
	if (!item.name || item.name.length === 0)
		return;
	
	if (item.prototype) {
		if (!delgs.has(item.prototype.name)) {
			delgs.set(item.prototype.name, item.prototype);
		}
		processMethod(item.prototype, delgs, enums);
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

function addSearchEntry(item) {
	const newItem = $('<li>')
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
	$('#nav-list').append(newItem);

	const newData = $('<option>').val(item.name);
	$('#search-list').append(newData);
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
				if (items.length == 0)
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

			hljs.highlightAll();
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
	$('#search-clear').on('click', function() {
		$('#search-input').val('');
		$('#search-clear').hide();
	});

	$('#search-input').on('input', function() {
		const value = $(this).val();
		if (value.trim() === '') {
			$('#search-clear').hide();
		} else {
			$('#search-clear').show();
		}
	});

	$('#search-form').on('keydown', function(event) {
		if (event.key === 'Enter' || event.keyCode === 13) {
			event.preventDefault();
			var search = this['search'].value;
			const target = $(`#nav-${search}`);
			if (target.length) {
				target[0].click();
			}
		}
	});

	$('#search-form').on('submit', function(event) {
		event.preventDefault();
	});

	$('#submit-form').on('submit', function(event) {
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

	generateBody();
});
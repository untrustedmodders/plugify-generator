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

function formatType(item) {
	var type = item.type;
	if (item.ref && item.ref === true) {
		type += '& ';
	} else {
		type += ' ';
	}
	return type;
}

function createSection(item) {
	var parameterString = '';

	const parameterTypes = $('<ul>');
	$.each(item.paramTypes, function(index, item) {
		const element = $('<li>');
		const paramCode = formatType(item);
		const paramType = $('<strong>').addClass('me-1 text-green')
			.text(paramCode);
		if (item.type == 'function' && item.prototype) {
			const paramName = $('<strong>');
			const paramLink = $('<a>').addClass('me-1 text-blue').attr(
					'href', `#item-${item.prototype.name}`)
				.text(item.description);
			paramName.append(paramLink);
			paramType.append(paramName);
		} else {
			const paramName = $('<strong>').addClass('me-1 text-blue')
				.text(item.description);
			paramType.append(paramName);
		}
		element.append(paramType);
		parameterTypes.append(element);
		parameterString += (`${paramCode}${item.name}, `);
	});

	if (parameterString && parameterString.length > 0) {
		parameterString = parameterString.slice(0, -2);
	}

	const returnCode = formatType(item.retType);
	const returnType = $('<strong>').addClass('me-1 text-green').text(
		returnCode);
	const returnName = $('<strong>').addClass('me-1 text-blue').text(item
		.retType.name);
	returnType.append(returnName);

	const functionCode = $('<pre>').append(
		$('<code>').addClass('language-go').text(
			`${returnCode}${item.name}(${parameterString})`)
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
		.append(returnType);
}

function createPrototype(map, item) {
	$.each(item.paramTypes, function(index, item) {
		if (item.type == 'function' && item.name && item.prototype) {
			map.set(item.name, item.prototype);
			createPrototype(map, item.prototype);
		}
	});
	if (item.retType.type == 'function' && item.retType.name && item.retType
		.prototype) {
		map.set(item.retType.name, item.retType.prototype);
		createPrototype(map, item.retType.prototype);
	}
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

				const newFunctions = $('<tbody>')
				$.each(items, function(index, item) {
					newFunctions.append(createRow(item.name, item.description))
				});

				const heading = $('<h5>')
					.text('Functions:');
				const funcHeading = $('<h5>')
					.text('Function Documentation:');
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

				const table = $('<table>')
					.addClass('table table-bordered')
					.append(
						newFunctions
					);

				const tableWrapper = $('<div>')
					.addClass('table-responsive my-4')
					.append(table);

				const newContainer = $('<article>')
					.addClass('docs-article')
					.attr('id', `section-${group}`)
					.append(
						$('<header>')
						.addClass('docs-header')
						.append(
							docsHeading
						)
					)
					.append(heading, tableWrapper)
					.append(funcHeading);

				const map = new Map();

				$.each(items, function(index, item) {
					addSearchEntry(item);
					newContainer.append(createSection(item));

					createPrototype(map, item);
				});

				for (const [_, item] of map) {
					addSearchEntry(item);
					newContainer.append(createSection(item));
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
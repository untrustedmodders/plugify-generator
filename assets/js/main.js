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
		type += '&';
	}
	return type;
}

function createSection(item) {
	var parameterString = '';
	
	const parameterTypes = $('<ul>');
	$.each(item.paramTypes, function(index, item) {
		parameterTypes.append(
			$('<li>').html(
				`<strong class='me-1 text-green'>${formatType(item)}</strong> <strong class='me-1 text-blue'>${item.name}</strong> ${item.description}`
			));
		parameterString += (`${formatType(item)} ${item.name}, `);
	});
	
	if (parameterString && parameterString.length > 0) {
		parameterString = parameterString.slice(0, -2); 
	}
	
	const returnType = $('<p>').html(
		`<strong class='me-1 text-green'>${formatType(item.retType)}</strong> ${item.retType.description}`
	);

	const functionCode = $('<pre>').append(
		$('<code>').addClass('language-go').text(`${formatType(item.retType)} ${item.name}(${parameterString})`)
	);

	return $('<section>')
				.addClass('docs-section')
				.attr('id', `item-${item.name}`)
				.append($('<h2>').addClass('section-heading').text(item.name))
				.append($('<p>').text(item.description))
				.append($('<p>').html(functionCode))
				.append($('<h5>').text('Parameters:'))
				.append(
					parameterTypes
				)
				.append($('<h5>').text('Return:'))
				.append(
					returnType
				);
}

function loadManifest(jsonURL) {
	console.log(jsonURL)
	$.ajax({
        url: jsonURL,
        type: 'GET',
        dataType: 'text',
        success: function (response) {
			var data = safelyParseJSON(response);
			
			const groupedData = data.exportedMethods.reduce((acc, item) => {
				const group = item.group || '';
				if (!acc[group]) {
					acc[group] = [];
				}
				acc[group].push(item);
				return acc;
			}, {});
			
			var first = true;
			$.each(groupedData, function(group, items) {
				if (group) {
					const newSection = $('<li>')
						.addClass('nav-item section-title mt-3')
						.append(
							$('<a>')
								.addClass('nav-link scrollto')
								.attr('href', `#section-${group}`)
								.append(
									$('<span>')
										.addClass('theme-icon-holder me-2')
										.append(
											$('<i>').addClass('fas fa-arrow-down')
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
						const spanElement  = $('<span>')
							.addClass('docs-time')
							.text(d.toLocaleString());

						docsHeading.append(spanElement );
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
						
					$.each(items, function(index, item) {
						newContainer.append(createSection(item))
					});
					
					$('#docs-container').append(newContainer);
				}
				
				$.each(items, function(index, item) {
					const newItem = $('<li>')
						.addClass('nav-item')
						.append(
							$('<a>')
								.addClass('nav-link scrollto')
								.attr('href', `#item-${item.name}`)
								.text(item.name)
						);
					$('#nav-list').append(newItem);
				});
			});
	
			hljs.highlightAll();
			$('#main').show();
			$('#footer').show();
        },
        error: function (jqxhr, textStatus, error) {
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
	$('#submit-form').on('submit', function(e) {
		const form = this;
		if (!form.checkValidity()) {
		  event.preventDefault();
		  event.stopPropagation();
		}
		$(form).addClass('was-validated');
	
        var link = $('#input').find("input[name='file']").val();
		$.ajax({
			url: link,
			context: document.body
		}).done(function() {
			generateBody();
		});
    });

    generateBody();
});

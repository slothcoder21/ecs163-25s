/*
  d3 reference:
  
  d3.select() for selecting DOM elements
  d3.csv() for loading CSV data
  d3.scaleLinear(), d3.scaleOrdinal(), and d3.scalePoint() for creating scales
  d3.extent() for finding min/max values
  d3.schemeCategory10 for color schemes
  d3.axisBottom() / d3.axisLeft() for creating axes
  d3.pie() and d3.arc() for creating pie/donut charts
  d3.nest() for data aggregation
  d3.line() for creating line generators
 */

// Global variables for dashboard state
const svg = d3.select("svg");
const tooltip = d3.select(".tooltip");
let pokemonData = []; // Store loaded data globally
let selectedPokemon = new Set(); // Track selected Pokemon
let filteredPokemon = new Set(); // Track filtered Pokemon

// Get SVG dimensions
const { width, height } = svg.node().getBoundingClientRect();

// Layout configuration - partition screen into sections
const leftWidth = width * 0.4;
const rightWidth = width - leftWidth;
const topHeight = height * 0.5;
const bottomHeight = height - topHeight;

// Margin configuration for consistent spacing
const margin = { top: 40, right: 20, bottom: 40, left: 60 };

// Color scale for Pokemon types
const color = d3.scaleOrdinal(d3.schemeCategory10);

// Global scales and containers
let sx, sy, scatterG, parallelG, donutG, pointsContainer;

// Load and process Pokemon data
d3.csv("pokemon.csv").then(data => {
  // Convert string values to numbers and booleans
  data.forEach(d => {
    d.Attack = +d.Attack;
    d.Defense = +d.Defense;
    d.HP = +d.HP;
    d.Sp_Atk = +d.Sp_Atk;
    d.Sp_Def = +d.Sp_Def;
    d.Speed = +d.Speed;
    d.isLegendary = (d.isLegendary === 'True');
    d.id = d.Name + "_" + d.Type_1; // Create unique identifier
  });

  // Store data globally for interactions
  pokemonData = data;
  
  // Extract unique Pokemon types and set up color domain
  const types = Array.from(new Set(data.map(d => d.Type_1))).sort();
  color.domain(types);

  // Initialize all three visualization views
  createScatterPlot(data, types);
  createDonutChart(data);
  createParallelCoordinates(data);
});


 //Creates the scatter plot view

function createScatterPlot(data, types) {
  // Create scatter plot container group
  scatterG = svg.append("g").attr("transform", "translate(0,0)");
  
  // Set up scales for x (Attack) and y (Defense) axes
  sx = d3.scaleLinear()
    .domain(d3.extent(data, d => d.Attack)).nice()
    .range([margin.left, leftWidth - margin.right]);

  sy = d3.scaleLinear()
    .domain(d3.extent(data, d => d.Defense)).nice()
    .range([topHeight - margin.bottom, margin.top]);

  // Create X axis
  const xAxis = scatterG.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${topHeight - margin.bottom})`)
    .call(d3.axisBottom(sx).ticks(6));
    
  // Create Y axis
  const yAxis = scatterG.append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(sy).ticks(6));

  // Add axis labels
  scatterG.append("text")
    .attr("class", "axis-label")
    .attr("x", leftWidth / 2)
    .attr("y", topHeight - 5)
    .attr("text-anchor", "middle")
    .text("Attack");

  scatterG.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -topHeight / 2)
    .attr("y", 15)
    .attr("text-anchor", "middle")
    .text("Defense");

  // Add chart title
  scatterG.append("text")
    .attr("class", "view-title")
    .attr("x", leftWidth / 2)
    .attr("y", margin.top - 20)
    .text("Attack vs Defense by Primary Type (Interactive)");

  // Create container for data points
  pointsContainer = scatterG.append("g").attr("class", "points-container");

  // Create scatter plot circles for each Pokemon
  pointsContainer.selectAll("circle")
    .data(data)
    .enter().append("circle")
    .attr("class", "pokemon-circle")
    .attr("cx", d => sx(d.Attack))
    .attr("cy", d => sy(d.Defense))
    .attr("r", 4)
    .attr("fill", d => color(d.Type_1))
    .attr("stroke", "none")
    .attr("stroke-width", 0)
    .style("cursor", "pointer")
    .on("mouseover", function(d) {
      // Show tooltip
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip.html(`<strong>${d.Name}</strong><br/>Type: ${d.Type_1}<br/>Attack: ${d.Attack}<br/>Defense: ${d.Defense}`)
        .style("left", (d3.event.pageX + 10) + "px")
        .style("top", (d3.event.pageY - 10) + "px");
      
      // Highlight this pokemon
      d3.select(this).attr("stroke", "#333").attr("stroke-width", 2);
      highlightInParallel(d.id);
    })
    .on("mouseout", function(d) {
      tooltip.transition().duration(200).style("opacity", 0);
      if (!selectedPokemon.has(d.id)) {
        d3.select(this).attr("stroke", "none").attr("stroke-width", 0);
      }
      unhighlightInParallel(d.id);
    })
    .on("click", function(d) {
      d3.event.stopPropagation();
      toggleSelection(d.id);
    });

  // Set up brushing
  const brush = d3.brush()
    .extent([[margin.left, margin.top], [leftWidth - margin.right, topHeight - margin.bottom]])
    .on("start brush end", function() {
      const selection = d3.event.selection;
      if (!selection) {
        clearFilter();
        return;
      }
      
      const [[x0, y0], [x1, y1]] = selection;
      filteredPokemon.clear();
      
      // Find points within brush
      pokemonData.forEach(d => {
        const x = sx(d.Attack);
        const y = sy(d.Defense);
        if (x >= x0 && x <= x1 && y >= y0 && y <= y1) {
          filteredPokemon.add(d.id);
        }
      });
      
      updateFilterDisplay();
    });

  // Add brush to scatter plot
  scatterG.append("g")
    .attr("class", "brush")
    .call(brush);

  // Set up zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([0.5, 10])
    .on("zoom", function() {
      const transform = d3.event.transform;
      
      // Transform the points
      pointsContainer.attr("transform", transform);
      
      // Update axes
      xAxis.call(d3.axisBottom(transform.rescaleX(sx)).ticks(6));
      yAxis.call(d3.axisLeft(transform.rescaleY(sy)).ticks(6));
    });

  scatterG.call(zoom);

  // Create legend
  createScatterLegend(types);
}

//Legend for Scatter Plot

function createScatterLegend(types) {
  const legend = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${topHeight + 10})`);

  const squareWidth = 8;
  const paddingX = 60;
  const paddingY = 20;
  const itemsPerRow = 5;

  types.forEach((type, i) => {
    const col = i % itemsPerRow;
    const row = Math.floor(i / itemsPerRow);
    const legendItem = legend.append("g").attr("transform", `translate(${col * paddingX}, ${row * paddingY})`); //transforms the legend with padding

    legendItem.append("rect")
      .attr("width", squareWidth)
      .attr("height", squareWidth)
      .attr("fill", color(type));

    legendItem.append("text")
      .attr("x", squareWidth + 4)
      .attr("y", squareWidth - 1)
      .attr("font-size", "10px")
      .text(type);
  });
}


//Creates donut chart 
 
function createDonutChart(data) {
  donutG = svg.append("g")
    .attr("transform", `translate(${leftWidth/2}, ${topHeight + bottomHeight/2})`);

  const legendaryData = d3.nest()
    .key(d => d.isLegendary)
    .rollup(v => v.length)
    .entries(data);

  const pie = d3.pie().value(d => d.value);
  const arc = d3.arc().innerRadius(40).outerRadius(80);
  
  const arcs = donutG.selectAll(".arc")
    .data(pie(legendaryData))
    .enter().append("g")
    .attr("class", "arc");

  arcs.append("path")
    .attr("d", arc)
    .attr("fill", d => d.data.key === 'true' ? "#ff7f0e" : "#1f77b4");

  arcs.append("text")
    .attr("transform", d => `translate(${arc.centroid(d)})`)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .text(d => `${d.data.key==='true'?'Legendary':'Normal'} (${d.data.value})`);

  donutG.append("text")
    .attr("class", "view-title")
    .attr("x", 0)
    .attr("y", -100)
    .text("Legendary vs Non-Legendary Distribution");
}

//Parallel Coordinate Chart

function createParallelCoordinates(data) {
  const parallelWidth = rightWidth - margin.left - margin.right;
  const parallelHeight = bottomHeight - margin.top - margin.bottom;
  
  parallelG = svg.append("g")
    .attr("transform", `translate(${leftWidth + margin.left}, ${topHeight + margin.top})`);

  const dimensions = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];
  const yScales = {};
  
  dimensions.forEach(dim => {
    yScales[dim] = d3.scaleLinear()
      .domain(d3.extent(data, p => p[dim])).nice()
      .range([parallelHeight, 0]);
  });

  const xScale = d3.scalePoint()
    .domain(dimensions)
    .range([0, parallelWidth]);

  const line = d3.line();
  
  // Create lines for each Pokemon
  parallelG.selectAll("path")
    .data(data)
    .enter().append("path")
    .attr("class", "pokemon-line")
    .attr("d", d => line(dimensions.map(dim => [xScale(dim), yScales[dim](d[dim])])))
    .attr("fill", "none")
    .attr("stroke", d => color(d.Type_1))
    .attr("stroke-opacity", 0.3)
    .attr("stroke-width", 1)
    .style("cursor", "pointer")
    .on("mouseover", function(d) {
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip.html(`<strong>${d.Name}</strong><br/>Type: ${d.Type_1}<br/>HP: ${d.HP}, Attack: ${d.Attack}`)
        .style("left", (d3.event.pageX + 10) + "px")
        .style("top", (d3.event.pageY - 10) + "px");
      
      d3.select(this).attr("stroke-width", 3).attr("stroke-opacity", 0.8);
      highlightInScatter(d.id);
    })
    .on("mouseout", function(d) {
      tooltip.transition().duration(200).style("opacity", 0);
      if (!selectedPokemon.has(d.id)) {
        d3.select(this).attr("stroke-width", 1).attr("stroke-opacity", 0.3);
      }
      unhighlightInScatter(d.id);
    })
    .on("click", function(d) {
      d3.event.stopPropagation();
      toggleSelection(d.id);
    });

  // Create axes
  dimensions.forEach(dim => {
    const axisGroup = parallelG.append("g")
      .attr("transform", `translate(${xScale(dim)}, 0)`);

    axisGroup.call(d3.axisLeft(yScales[dim]).ticks(4));

    axisGroup.append("text")
      .attr("class", "axis-label")
      .attr("text-anchor", "middle")
      .attr("x", 0)
      .attr("y", -10)
      .attr("fill", "#000")
      .attr("font-size", "10px")
      .text(dim);
  });

  parallelG.append("text")
    .attr("class", "view-title")
    .attr("x", parallelWidth / 2)
    .attr("y", -margin.top / 2)
    .text("Pokemon Stat Profiles - Parallel Plot");
}

// Select which pokemon 
function toggleSelection(pokemonId) {
  if (selectedPokemon.has(pokemonId)) {
    selectedPokemon.delete(pokemonId);
  } else {
    selectedPokemon.add(pokemonId);
  }
  updateSelectionDisplay();
}

// updates the rest of the graph
function updateSelectionDisplay() {
  // Update circles in scatter plot
  scatterG.selectAll(".pokemon-circle")
    .each(function(d) {
      const circle = d3.select(this);
      if (selectedPokemon.has(d.id)) {
        circle.classed("selected", true)
          .transition().duration(300)
          .attr("stroke", "#ff0000")
          .attr("stroke-width", 3);
      } else {
        circle.classed("selected", false)
          .transition().duration(300)
          .attr("stroke", "none")
          .attr("stroke-width", 0);
      }
    });

  // Update lines in parallel coordinates
  parallelG.selectAll(".pokemon-line")
    .each(function(d) {
      const line = d3.select(this);
      if (selectedPokemon.has(d.id)) {
        line.classed("selected", true)
          .transition().duration(300)
          .attr("stroke-width", 3)
          .attr("stroke-opacity", 1);
      } else {
        line.classed("selected", false)
          .transition().duration(300)
          .attr("stroke-width", 1)
          .attr("stroke-opacity", 0.3);
      }
    });
}

// update filters
function updateFilterDisplay() {
  if (filteredPokemon.size === 0) {
    // Show all
    scatterG.selectAll(".pokemon-circle")
      .transition().duration(500)
      .style("opacity", 1);
      
    parallelG.selectAll(".pokemon-line")
      .transition().duration(500)
      .attr("stroke-opacity", 0.3);
  } else {
    // Filter display
    scatterG.selectAll(".pokemon-circle")
      .transition().duration(500)
      .style("opacity", d => filteredPokemon.has(d.id) ? 1 : 0.15);
      
    parallelG.selectAll(".pokemon-line")
      .transition().duration(500)
      .attr("stroke-opacity", d => filteredPokemon.has(d.id) ? 0.8 : 0.05);
  }
}

// highlight functions 
function highlightInParallel(pokemonId) {
  parallelG.selectAll(".pokemon-line")
    .filter(d => d.id === pokemonId)
    .attr("stroke-width", 3)
    .attr("stroke-opacity", 0.8);
}

function unhighlightInParallel(pokemonId) {
  parallelG.selectAll(".pokemon-line")
    .filter(d => d.id === pokemonId && !selectedPokemon.has(pokemonId))
    .attr("stroke-width", 1)
    .attr("stroke-opacity", 0.3);
}

function highlightInScatter(pokemonId) {
  scatterG.selectAll(".pokemon-circle")
    .filter(d => d.id === pokemonId)
    .attr("stroke", "#333")
    .attr("stroke-width", 2);
}

function unhighlightInScatter(pokemonId) {
  scatterG.selectAll(".pokemon-circle")
    .filter(d => d.id === pokemonId && !selectedPokemon.has(pokemonId))
    .attr("stroke", "none")
    .attr("stroke-width", 0);
}

// clear filter
function clearFilter() {
  filteredPokemon.clear();
  updateFilterDisplay();
}

// global functions for buttons
function clearSelection() {
  selectedPokemon.clear();
  filteredPokemon.clear();
  
  // Clear brush
  if (scatterG) {
    scatterG.select(".brush").call(d3.brush().clear);
  }
  
  updateSelectionDisplay();
  updateFilterDisplay();
}

function resetZoom() {
  if (scatterG) {
    const zoom = d3.zoom().scaleExtent([0.5, 10]);
    scatterG.transition().duration(750)
      .call(zoom.transform, d3.zoomIdentity);
  }
}